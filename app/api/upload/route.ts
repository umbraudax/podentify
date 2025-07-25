import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { isValidAudioFile, isValidFileSize } from '@/lib/utils';

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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type and size
    if (!isValidAudioFile(file)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    if (!isValidFileSize(file)) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
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
        audio_url: `/api/audio/${user.id}/${filename}`,
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

    // Start transcription process (we'll create this function next)
    startTranscriptionProcess(episode.id, filepath);

    return NextResponse.json({ 
      message: 'File uploaded successfully',
      episode: episode
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

async function startTranscriptionProcess(episodeId: string, filePath: string) {
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

    // Call AssemblyAI API (we'll implement this next)
    if (transcript) {
      processTranscriptWithAssemblyAI(transcript.id, filePath);
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

async function processTranscriptWithAssemblyAI(transcriptId: string, filePath: string) {
  try {
    // Call the transcription API in the background
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcriptId,
        filePath
      })
    });

    if (!response.ok) {
      throw new Error(`Transcription API call failed: ${response.statusText}`);
    }

    console.log(`Successfully started transcription for transcript ${transcriptId}`);
  } catch (error) {
    console.error('Error calling transcription API:', error);
    
    // Update transcript status to failed
    await supabaseAdmin
      .from('transcripts')
      .update({ 
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', transcriptId);
  }
} 