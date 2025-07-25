import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with service role for server operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: episodeId } = params;
    
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

    // First, get the episode to verify ownership and get file info
    const { data: episode, error: episodeError } = await supabaseAdmin
      .from('episodes')
      .select('*')
      .eq('id', episodeId)
      .eq('user_id', user.id)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json({ 
        error: 'Episode not found or you do not have permission to delete it' 
      }, { status: 404 });
    }

    // Start transaction-like deletion process
    console.log(`Starting deletion process for episode ${episodeId}`);

    // 1. Delete transcript words (cascade will handle this, but being explicit)
    const { data: transcripts } = await supabaseAdmin
      .from('transcripts')
      .select('id')
      .eq('episode_id', episodeId);

    if (transcripts && transcripts.length > 0) {
      for (const transcript of transcripts) {
        const { error: wordsError } = await supabaseAdmin
          .from('transcript_words')
          .delete()
          .eq('transcript_id', transcript.id);
        
        if (wordsError) {
          console.warn(`Error deleting transcript words for transcript ${transcript.id}:`, wordsError);
        }
      }

      // 2. Delete transcripts
      const { error: transcriptError } = await supabaseAdmin
        .from('transcripts')
        .delete()
        .eq('episode_id', episodeId);

      if (transcriptError) {
        console.warn('Error deleting transcripts:', transcriptError);
      }
    }

    // 3. Delete social clips (if any exist in the future)
    const { error: clipsError } = await supabaseAdmin
      .from('social_clips')
      .delete()
      .eq('episode_id', episodeId);

    if (clipsError) {
      console.warn('Error deleting social clips:', clipsError);
    }

    // 4. Delete the audio file from filesystem
    if (episode.audio_url) {
      try {
        // Extract file path from URL (assuming format /api/audio/{userId}/{filename})
        const urlParts = episode.audio_url.split('/');
        const filename = urlParts[urlParts.length - 1];
        const userId = urlParts[urlParts.length - 2];
        
        if (userId && filename) {
          const filePath = path.join(process.cwd(), 'uploads', userId, filename);
          
          if (existsSync(filePath)) {
            await unlink(filePath);
            console.log(`Deleted audio file: ${filePath}`);
          }
        }
      } catch (fileError) {
        console.warn('Error deleting audio file:', fileError);
        // Don't fail the entire operation if file deletion fails
      }
    }

    // 5. Finally, delete the episode record
    const { error: episodeDeleteError } = await supabaseAdmin
      .from('episodes')
      .delete()
      .eq('id', episodeId)
      .eq('user_id', user.id);

    if (episodeDeleteError) {
      console.error('Error deleting episode record:', episodeDeleteError);
      return NextResponse.json({ 
        error: 'Failed to delete episode record' 
      }, { status: 500 });
    }

    console.log(`Successfully deleted episode ${episodeId} and all associated data`);

    return NextResponse.json({ 
      message: 'Episode deleted successfully',
      deletedEpisode: {
        id: episode.id,
        title: episode.title
      }
    });

  } catch (error) {
    console.error('Episode deletion error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete episode',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 