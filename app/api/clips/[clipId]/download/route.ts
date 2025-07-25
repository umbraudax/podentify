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
        episodes!inner(id, title, audio_url, user_id)
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

    // Check if clip already exists
    if (clip.clip_url) {
      // Return existing clip
      const clipPath = path.join(process.cwd(), clip.clip_url);
      if (existsSync(clipPath)) {
        const clipBuffer = await readFile(clipPath);
        
        return new NextResponse(clipBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': `attachment; filename="${clip.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3"`
          }
        });
      }
    }

    // Generate new clip
    const sourceAudioPath = path.join(process.cwd(), clip.episodes.audio_url.replace('/api/audio/', 'uploads/'));
    
    // Create clips directory
    const clipsDir = path.join(process.cwd(), 'uploads', user.id, 'clips');
    if (!existsSync(clipsDir)) {
      await mkdir(clipsDir, { recursive: true });
    }

    const outputPath = path.join(clipsDir, `${clipId}.mp3`);
    const relativePath = path.join('uploads', user.id, 'clips', `${clipId}.mp3`);

    // Extract the clip using ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(sourceAudioPath)
        .seekInput(clip.start_time)
        .duration(clip.duration)
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .format('mp3')
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    // Update the clip with the generated URL
    await supabaseAdmin
      .from('social_clips')
      .update({ clip_url: relativePath })
      .eq('id', clipId);

    // Return the generated clip
    const clipBuffer = await readFile(outputPath);
    
    return new NextResponse(clipBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${clip.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3"`
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