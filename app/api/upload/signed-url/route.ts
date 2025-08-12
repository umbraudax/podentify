import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { MAX_FILE_SIZE, MEDIA_TYPES, SUPPORTED_AUDIO_FORMATS, SUPPORTED_VIDEO_FORMATS } from '@/lib/constants';
import { getUserCredits, hasEnoughCredits } from '@/lib/credit-service';

// Server-side Supabase client (service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type SignedUrlRequestBody = {
  fileName: string;
  fileSize: number;
  mimeType?: string;
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

    // Parse body
    const body = (await request.json()) as SignedUrlRequestBody;
    const { fileName, fileSize } = body || {} as SignedUrlRequestBody;
    if (!fileName || typeof fileSize !== 'number') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Basic size validation (client also validates)
    if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // Credit pre-check (estimate from size, conservative)
    const userCredits = await getUserCredits(user.id);
    if (!userCredits || userCredits.current_credits <= 0) {
      return NextResponse.json({
        error: 'Insufficient credits. Please upgrade your plan or purchase additional credits.',
        credits: userCredits?.current_credits || 0,
      }, { status: 402 });
    }

    const estimatedMinutes = Math.ceil((fileSize / (1024 * 1024)) * 2);
    if (!await hasEnoughCredits(user.id, estimatedMinutes)) {
      return NextResponse.json({
        error: `Insufficient credits. This file is estimated to need ${estimatedMinutes} credits. You have ${userCredits.current_credits} credits available.`,
        required_credits: estimatedMinutes,
        available_credits: userCredits.current_credits,
      }, { status: 402 });
    }

    // Decide media type from filename extension
    const ext = fileName.split('.').pop()?.toLowerCase();
    let mediaType: string | null = null;
    if (ext && SUPPORTED_AUDIO_FORMATS.includes(ext)) mediaType = MEDIA_TYPES.AUDIO;
    if (ext && SUPPORTED_VIDEO_FORMATS.includes(ext)) mediaType = MEDIA_TYPES.VIDEO;
    if (!mediaType) return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });

    // Build object key path inside private bucket
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).slice(2);
    const extension = path.extname(fileName) || '';
    const objectKey = `${user.id}/${timestamp}-${randomPart}${extension}`;

    // Create a signed upload URL (no public write needed)
    const { data, error } = await supabaseAdmin.storage
      .from('user-uploads')
      .createSignedUploadUrl(objectKey);

    if (error || !data) {
      console.error('Failed creating signed upload URL:', error);
      return NextResponse.json({ error: 'Failed to create signed upload URL' }, { status: 500 });
    }

    return NextResponse.json({
      objectKey,
      signedUrl: data.signedUrl,
      token: data.token,
      estimated_credits: estimatedMinutes,
      mediaType,
    });
  } catch (err) {
    console.error('Signed URL error:', err);
    return NextResponse.json({ error: 'Failed to initialize upload' }, { status: 500 });
  }
}


