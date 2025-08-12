import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

// Create a Supabase client with service role for server operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { clipId: string } }
) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clipId = params.clipId;

    // Get the social clip
    const { data: clip, error: clipError } = await supabaseAdmin
      .from('social_clips')
      .select(`
        *,
        episodes!inner(id, title, audio_url, user_id, media_type)
      `)
      .eq('id', clipId)
      .single();

    if (clipError || !clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    // Verify user owns this episode
    if (clip.episodes.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If a clip already exists locally, return it (temporary until moved to storage)

    // Generate new clip
    const isVideoSource = clip.episodes.media_type === 'video';
    const sourceFilePath = path.join(process.cwd(), 
      clip.episodes.audio_url.replace(isVideoSource ? '/api/video/' : '/api/audio/', 'uploads/')
    );
    
    // Create clips directory
    const clipsDir = path.join(process.cwd(), 'uploads', user.id, 'clips');
    if (!existsSync(clipsDir)) {
      await mkdir(clipsDir, { recursive: true });
    }

    // Determine output format and file extension based on source media type
    const outputExtension = isVideoSource ? '.mp4' : '.mp3';
    const outputPath = path.join(clipsDir, `${clipId}${outputExtension}`);
    const relativePath = path.join('uploads', user.id, 'clips', `${clipId}${outputExtension}`);

    // Extract the clip using ffmpeg
    await new Promise<void>((resolve, reject) => {
      const ffmpegCommand = ffmpeg(sourceFilePath)
        .seekInput(clip.start_time)
        .duration(clip.duration)
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err));

      if (isVideoSource) {
        // For video clips, preserve video quality but optimize for smaller file size
        ffmpegCommand
          .videoCodec('libx264')
          .audioCodec('aac')
          .videoBitrate('1000k')
          .audioBitrate(128)
          .format('mp4')
          .outputOptions([
            '-preset', 'medium',
            '-crf', '28',
            '-movflags', '+faststart' // Optimize for web streaming
          ]);
      } else {
        // For audio clips, use the existing settings
        ffmpegCommand
          .audioCodec('libmp3lame')
          .audioBitrate(128)
          .format('mp3');
      }

      ffmpegCommand.run();
    });

    // Update the clip with the generated URL
    await supabaseAdmin
      .from('social_clips')
      .update({ clip_url: relativePath })
      .eq('id', clipId);

    // Return the generated clip
    const clipBuffer = await readFile(outputPath);
    const contentType = isVideoSource ? 'video/mp4' : 'audio/mpeg';
    const filename = `${clip.title.replace(/[^a-zA-Z0-9]/g, '_')}${outputExtension}`;
    
    return new NextResponse(clipBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error('Error generating clip:', error);
    return NextResponse.json(
      { error: 'Failed to generate clip' },
      { status: 500 }
    );
  }
} 