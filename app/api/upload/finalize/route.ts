import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AssemblyAI } from 'assemblyai';
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

    if (mediaType === MEDIA_TYPES.AUDIO) {
      const lowerOriginal = originalName.toLowerCase();
      const isM4AByName = lowerOriginal.endsWith('.m4a') || objectKey.toLowerCase().endsWith('.m4a');
      const isMp4Container = detected.mime === 'video/mp4' || detected.mime === 'audio/mp4';

      const looksAudio = detected.mime.startsWith('audio/') || (isM4AByName && isMp4Container);
      if (!looksAudio) {
        return NextResponse.json({ error: `Expected audio but detected ${detected.mime}` }, { status: 400 });
      }
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

    // Upsert/Reuse episode row linked to storage object to avoid duplicates
    const { data: existingEpisode } = await supabaseAdmin
      .from('episodes')
      .select('*')
      .eq('storage_key', objectKey)
      .eq('user_id', user.id)
      .single();

    let episode = existingEpisode;
    let dbError: any = null;

    if (!episode) {
      const insertRes = await supabaseAdmin
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
      episode = insertRes.data as any;
      dbError = insertRes.error;
    }

    if (dbError || !episode) {
      console.error('Failed to insert episode:', dbError);
      return NextResponse.json({ error: 'Failed to create episode record' }, { status: 500 });
    }

    // Create transcript record if not exists and set episode to processing
    const { data: existingTranscript } = await supabaseAdmin
      .from('transcripts')
      .select('*')
      .eq('episode_id', episode.id)
      .single();

    let transcript = existingTranscript;
    if (!transcript) {
      const inserted = await supabaseAdmin
        .from('transcripts')
        .insert({ episode_id: episode.id, status: 'processing' })
        .select()
        .single();
      transcript = inserted.data as any;
    }

    await supabaseAdmin
      .from('episodes')
      .update({ status: 'processing' })
      .eq('id', episode.id);

    // Kick off background transcription: prefer internal API; fall back to direct provider call
    const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const appUrl = rawAppUrl
      ? (/^https?:\/\//i.test(rawAppUrl) ? rawAppUrl.replace(/\/$/, '') : `https://${rawAppUrl.replace(/\/$/, '')}`)
      : '';
    let enqueued = false;
    if (appUrl && transcript) {
      try {
        const resp = await fetch(`${appUrl}/api/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcriptId: transcript.id,
            filePath: objectKey,
            userId: user.id,
            shouldCleanup: false,
          }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        enqueued = true;
      } catch (e) {
        console.error('Transcribe POST failed, will queue directly:', e);
      }
    } else {
      if (!appUrl) console.error('Missing NEXT_PUBLIC_APP_URL or invalid format (needs https://...)');
    }

    if (!enqueued && transcript) {
      try {
        // Create a signed URL for provider to fetch
        const { data: signed, error: signErr } = await supabaseAdmin.storage
          .from('user-uploads')
          .createSignedUrl(objectKey, 60 * 60 * 24);
        if (signErr || !signed?.signedUrl) {
          throw signErr || new Error('Failed to create signed URL');
        }

        const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY! });
        const webhookUrl = appUrl ? `${appUrl}/api/transcribe/webhook?tid=${encodeURIComponent(transcript.id)}&uid=${encodeURIComponent(user.id)}` : undefined;
        await client.transcripts.create({
          audio_url: signed.signedUrl,
          speaker_labels: true,
          auto_highlights: false,
          punctuate: true,
          format_text: true,
          language_detection: true,
          webhook_url: webhookUrl,
        } as any);
        enqueued = true;
      } catch (e) {
        console.error('Direct transcription queueing failed:', e);
      }
    }

    if (!enqueued && transcript) {
      // Mark failed so UI does not spin forever
      await supabaseAdmin.from('transcripts').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', transcript.id);
      await supabaseAdmin.from('episodes').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', episode.id);
      return NextResponse.json({ error: 'Failed to queue transcription' }, { status: 500 });
    }

    return NextResponse.json({ episode });
  } catch (err) {
    console.error('Finalize upload error:', err);
    return NextResponse.json({ error: 'Failed to finalize upload' }, { status: 500 });
  }
}


