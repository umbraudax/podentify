import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { geminiService } from '@/lib/gemini-service';

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

    const { episodeId, generateMore = false } = await request.json();

    if (!episodeId) {
      return NextResponse.json({ error: 'Episode ID is required' }, { status: 400 });
    }

    // Verify user owns this episode
    const { data: episode, error: episodeError } = await supabaseAdmin
      .from('episodes')
      .select('id, title')
      .eq('id', episodeId)
      .eq('user_id', user.id)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    // Get the transcript
    const { data: transcript, error: transcriptError } = await supabaseAdmin
      .from('transcripts')
      .select('*')
      .eq('episode_id', episodeId)
      .single();

    if (transcriptError || !transcript || transcript.status !== 'completed') {
      return NextResponse.json({ error: 'Transcript not ready' }, { status: 400 });
    }

    // Get transcript words for precise timing
    const { data: transcriptWords, error: wordsError } = await supabaseAdmin
      .from('transcript_words')
      .select('word, start_time, end_time, speaker')
      .eq('transcript_id', transcript.id)
      .order('word_index');

    if (wordsError || !transcriptWords) {
      return NextResponse.json({ error: 'Transcript words not found' }, { status: 400 });
    }

    let newClips = [];

    if (generateMore) {
      // Get existing clips to avoid duplicates
      const { data: existingClips } = await supabaseAdmin
        .from('social_clips')
        .select('start_time, end_time, title, engagement_score')
        .eq('episode_id', episodeId);

      // Convert existing clips to the expected format
      const formattedExistingClips = (existingClips || []).map(clip => ({
        title: clip.title,
        start_time: clip.start_time,
        end_time: clip.end_time,
        engagement_score: clip.engagement_score || 50,
        engagement_label: 'Existing'
      }));

      // Generate additional clips
      console.log('Generating additional social clips with Gemini AI...');
      newClips = await geminiService.generateAdditionalClips(
        transcript.full_text || '',
        formattedExistingClips,
        transcriptWords
      );
    } else {
      // First time generation - delete any existing clips
      await supabaseAdmin
        .from('social_clips')
        .delete()
        .eq('episode_id', episodeId);

      // Generate initial clips
      console.log('Generating social clips with Gemini AI...');
      const analysisResult = await geminiService.analyzeTranscript(
        transcript.full_text || '',
        transcriptWords
      );
      newClips = analysisResult.social_clips;
    }

    // Save social clips to database
    if (newClips.length > 0) {
      const clipsToInsert = newClips.map(clip => ({
        episode_id: episodeId,
        title: clip.title,
        start_time: Math.round(clip.start_time * 100) / 100, // Round to 2 decimal places
        end_time: Math.round(clip.end_time * 100) / 100, // Round to 2 decimal places
        duration: Math.round((clip.end_time - clip.start_time) * 100) / 100, // Round to 2 decimal places
        engagement_score: Math.floor(clip.engagement_score) // Ensure it's an integer
      }));

      console.log('Inserting clips:', clipsToInsert);

      const { data: insertedClips, error: clipsError } = await supabaseAdmin
        .from('social_clips')
        .insert(clipsToInsert)
        .select('*');

      if (clipsError) {
        console.error('Error inserting social clips:', clipsError);
        console.error('Attempted to insert:', JSON.stringify(clipsToInsert, null, 2));
        return NextResponse.json({ 
          error: 'Failed to save social clips', 
          details: clipsError.message,
          data: clipsToInsert 
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `${newClips.length} social clips generated successfully`,
        social_clips: insertedClips
      });
    }

    return NextResponse.json({
      success: true,
      message: 'No new clips generated',
      social_clips: []
    });

  } catch (error) {
    console.error('Error in social clips API:', error);
    return NextResponse.json(
      { error: 'Failed to generate social clips' },
      { status: 500 }
    );
  }
} 