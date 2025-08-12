import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fileTypeFromBuffer } from 'file-type';
import { MEDIA_TYPES } from '@/lib/constants';
import { getUserCredits, hasEnoughCredits } from '@/lib/credit-service';

// Server-side Supabase client (service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type FinalizeBody = {
  objectKey: string;
  originalName: string;
  title?: string;
  description?: string;
  mediaType: string; // 'audio' | 'video'
  estimatedMinutes: number;
};

export async function POST(request: NextRequest) {
  try {
    // Auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as FinalizeBody;
    const { objectKey, originalName, title, description, mediaType, estimatedMinutes } = body || {} as FinalizeBody;
    if (!objectKey || !originalName || !mediaType) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Ensure object exists and fetch its content-type and bytes (first 4100 bytes) to validate type
    const { data: signedForHead, error: signErr } = await supabaseAdmin.storage
      .from('user-uploads')
      .createSignedUrl(objectKey, 60);
    if (signErr || !signedForHead?.signedUrl) {
      console.error('Failed to sign for validation:', signErr);
      return NextResponse.json({ error: 'Failed to validate uploaded file' }, { status: 500 });
    }

    // Fetch a small chunk for magic bytes detection
    const probeResp = await fetch(signedForHead.signedUrl, { method: 'GET', headers: { Range: 'bytes=0-4096' } });
    if (!probeResp.ok) {
      const txt = await probeResp.text();
      return NextResponse.json({ error: `Unable to read uploaded file: ${probeResp.status} ${txt}` }, { status: 500 });
    }
    const buf = Buffer.from(await probeResp.arrayBuffer());
    const detected = await fileTypeFromBuffer(buf).catch(() => null);
    if (!detected) {
      return NextResponse.json({ error: 'Unable to detect file type' }, { status: 400 });
    }

    if (mediaType === MEDIA_TYPES.AUDIO && !detected.mime.startsWith('audio/')) {
      return NextResponse.json({ error: `Expected audio but detected ${detected.mime}` }, { status: 400 });
    }
    if (mediaType === MEDIA_TYPES.VIDEO && !detected.mime.startsWith('video/')) {
      return NextResponse.json({ error: `Expected video but detected ${detected.mime}` }, { status: 400 });
    }

    // Credits confirmation check
    const userCredits = await getUserCredits(user.id);
    if (!userCredits || userCredits.current_credits <= 0) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
    }
    if (!await hasEnoughCredits(user.id, estimatedMinutes)) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
    }

    // Create episode row linked to storage object
    const { data: episode, error: dbError } = await supabaseAdmin
      .from('episodes')
      .insert({
        user_id: user.id,
        title: title || originalName.replace(/\.[^/.]+$/, ''),
        description: description || null,
        audio_url: mediaType === MEDIA_TYPES.VIDEO
          ? `/api/video/${user.id}/${objectKey.split('/').pop()}`
          : `/api/audio/${user.id}/${objectKey.split('/').pop()}`,
        storage_key: objectKey,
        media_type: mediaType,
        status: 'uploading',
      })
      .select()
      .single();

    if (dbError || !episode) {
      console.error('Failed to insert episode:', dbError);
      return NextResponse.json({ error: 'Failed to create episode record' }, { status: 500 });
    }

    // Create transcript record and set episode to processing
    const { data: transcript } = await supabaseAdmin
      .from('transcripts')
      .insert({
        episode_id: episode.id,
        status: 'processing',
      })
      .select()
      .single();

    await supabaseAdmin
      .from('episodes')
      .update({ status: 'processing' })
      .eq('id', episode.id);

    // Kick off background transcription via internal API
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      console.error('Missing NEXT_PUBLIC_APP_URL');
    } else if (transcript) {
      fetch(`${appUrl}/api/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptId: transcript.id,
          filePath: objectKey,
          userId: user.id,
          shouldCleanup: false,
        }),
      }).catch((e) => console.error('Failed to start transcription:', e));
    }

    return NextResponse.json({ episode });
  } catch (err) {
    console.error('Finalize upload error:', err);
    return NextResponse.json({ error: 'Failed to finalize upload' }, { status: 500 });
  }
}


