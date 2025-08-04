import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { isValidMediaFile, getMediaType, isValidFileSize } from '@/lib/utils';
import { MEDIA_TYPES } from '@/lib/constants';
import { getUserCredits, hasEnoughCredits } from '@/lib/credit-service';
import ffmpeg from 'fluent-ffmpeg';

// Create a Supabase client with service role for server operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
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

    // Check user credits before processing
    const userCredits = await getUserCredits(user.id);
    if (!userCredits || userCredits.current_credits <= 0) {
      return NextResponse.json({ 
        error: 'Insufficient credits. Please upgrade your plan or purchase additional credits.',
        credits: userCredits?.current_credits || 0
      }, { status: 402 }); // Payment Required
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type and size
    if (!isValidMediaFile(file)) {
      return NextResponse.json({ error: 'Invalid file type. Supported formats: mp3, wav, m4a, mp4, mov, avi, mkv, webm' }, { status: 400 });
    }

    // Determine media type
    const mediaType = getMediaType(file);
    if (!mediaType) {
      return NextResponse.json({ error: 'Unable to determine media type' }, { status: 400 });
    }

    if (!isValidFileSize(file)) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // Estimate duration based on file size (rough approximation)
    // For MP3: ~1MB per minute at 128kbps, but this varies greatly
    // We'll do a conservative check here and proper deduction later
    const fileSizeMB = file.size / (1024 * 1024);
    const estimatedMinutes = Math.ceil(fileSizeMB * 2); // Conservative estimate - 2 minutes per MB

    // Check if user has enough credits for estimated duration
    if (!await hasEnoughCredits(user.id, estimatedMinutes)) {
      return NextResponse.json({ 
        error: `Insufficient credits. This file is estimated to need ${estimatedMinutes} credits. You have ${userCredits.current_credits} credits available.`,
        required_credits: estimatedMinutes,
        available_credits: userCredits.current_credits
      }, { status: 402 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', user.id);
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = path.extname(file.name);
    const filename = `${timestamp}-${Math.random().toString(36).substring(2)}${extension}`;
    const filepath = path.join(uploadsDir, filename);

    // Write file to disk
    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);
    await writeFile(filepath, buffer);

    // Ensure profile exists (safety check)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // Create profile if it doesn't exist (fallback)
      const { error: createProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || ''
        });

      if (createProfileError) {
        console.error('Failed to create profile:', createProfileError);
        return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
      }
    }

    // Create episode record in database
    const { data: episode, error: dbError } = await supabaseAdmin
      .from('episodes')
      .insert({
        user_id: user.id,
        title: title || file.name.replace(extension, ''),
        description: description || null,
        audio_url: mediaType === MEDIA_TYPES.VIDEO ? `/api/video/${user.id}/${filename}` : `/api/audio/${user.id}/${filename}`,
        media_type: mediaType,
        status: 'uploading'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ 
        error: 'Failed to create episode record', 
        details: dbError.message 
      }, { status: 500 });
    }

    // Start transcription process
    startTranscriptionProcess(episode.id, filepath, user.id, mediaType);

    return NextResponse.json({ 
      message: 'File uploaded successfully',
      episode: episode,
      estimated_credits: estimatedMinutes,
      remaining_credits: userCredits.current_credits
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

async function startTranscriptionProcess(episodeId: string, filePath: string, userId: string, mediaType: string) {
  try {
    // Update episode status to processing
    await supabaseAdmin
      .from('episodes')
      .update({ status: 'processing' })
      .eq('id', episodeId);

    // Create transcript record
    const { data: transcript } = await supabaseAdmin
      .from('transcripts')
      .insert({
        episode_id: episodeId,
        status: 'processing'
      })
      .select()
      .single();

    // Call AssemblyAI API - don't await to allow the upload response to return immediately
    if (transcript) {
      // Use Promise to handle the async call without blocking the upload response
      processTranscriptWithAssemblyAI(transcript.id, filePath, userId, mediaType).catch(error => {
        console.error('Background transcription failed:', error);
      });
    }

  } catch (error) {
    console.error('Transcription process error:', error);
    
    // Update episode status to failed
    await supabaseAdmin
      .from('episodes')
      .update({ status: 'failed' })
      .eq('id', episodeId);
  }
}

async function processTranscriptWithAssemblyAI(transcriptId: string, filePath: string, userId: string, mediaType: string) {
  let audioFilePath = filePath;
  let shouldCleanup = false;

  try {
    // If it's a video file, extract audio for transcription
    if (mediaType === MEDIA_TYPES.VIDEO) {
      const audioExtractPath = filePath.replace(path.extname(filePath), '_audio.wav');
      
      await new Promise<void>((resolve, reject) => {
        ffmpeg(filePath)
          .output(audioExtractPath)
          .audioCodec('pcm_s16le') // Uncompressed WAV for best transcription quality
          .format('wav')
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      audioFilePath = audioExtractPath;
      shouldCleanup = true;
      console.log(`Audio extracted from video: ${audioExtractPath}`);
    }
  } catch (error) {
    console.error('Error extracting audio from video:', error);
    throw error;
  }
  try {
    // Ensure we have the required environment variable
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      throw new Error('NEXT_PUBLIC_APP_URL environment variable is not set');
    }

    // Call the transcription API in the background
    const response = await fetch(`${appUrl}/api/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcriptId,
        filePath: audioFilePath,
        userId,
        shouldCleanup
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transcription API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    console.log(`Successfully started transcription for transcript ${transcriptId}`);
  } catch (error) {
    console.error('Error calling transcription API:', error);
    
    // Clean up extracted audio file if there was an error
    if (shouldCleanup && audioFilePath !== filePath) {
      try {
        await unlink(audioFilePath);
        console.log(`Cleaned up extracted audio file: ${audioFilePath}`);
      } catch (cleanupError) {
        console.error('Error cleaning up extracted audio:', cleanupError);
      }
    }
    
    // Update transcript status to failed
    await supabaseAdmin
      .from('transcripts')
      .update({ 
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', transcriptId);

    // Also update episode status to failed
    const { data: transcript } = await supabaseAdmin
      .from('transcripts')
      .select('episode_id')
      .eq('id', transcriptId)
      .single();

    if (transcript) {
      await supabaseAdmin
        .from('episodes')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', transcript.episode_id);
    }
  }
} 