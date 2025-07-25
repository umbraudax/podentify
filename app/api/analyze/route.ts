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

    const { episodeId } = await request.json();

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

    // Check if analysis already exists
    const { data: existingChapters } = await supabaseAdmin
      .from('chapters')
      .select('id')
      .eq('episode_id', episodeId)
      .limit(1);

    const { data: existingClips } = await supabaseAdmin
      .from('social_clips')
      .select('id')
      .eq('episode_id', episodeId)
      .limit(1);

    if ((existingChapters?.length || 0) > 0 && (existingClips?.length || 0) > 0) {
      return NextResponse.json({ 
        message: 'Analysis already exists',
        alreadyAnalyzed: true 
      });
    }

    // Analyze with Gemini AI
    console.log('Analyzing transcript with Gemini AI...');
    const analysisResult = await geminiService.analyzeTranscript(
      transcript.full_text || '',
      transcriptWords
    );

    // Save chapters to database
    if (analysisResult.chapters.length > 0) {
      const chaptersToInsert = analysisResult.chapters.map((chapter, index) => ({
        episode_id: episodeId,
        title: chapter.title,
        start_time: chapter.start_time,
        end_time: chapter.end_time,
        duration: chapter.end_time - chapter.start_time,
        summary: chapter.summary,
        chapter_index: index
      }));

      const { error: chaptersError } = await supabaseAdmin
        .from('chapters')
        .insert(chaptersToInsert);

      if (chaptersError) {
        console.error('Error inserting chapters:', chaptersError);
      }
    }

    // Save social clips to database
    if (analysisResult.social_clips.length > 0) {
      const clipsToInsert = analysisResult.social_clips.map(clip => ({
        episode_id: episodeId,
        title: clip.title,
        start_time: clip.start_time,
        end_time: clip.end_time,
        duration: clip.end_time - clip.start_time,
        engagement_score: clip.engagement_score
      }));

      const { error: clipsError } = await supabaseAdmin
        .from('social_clips')
        .insert(clipsToInsert);

      if (clipsError) {
        console.error('Error inserting social clips:', clipsError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Analysis completed',
      chapters: analysisResult.chapters,
      social_clips: analysisResult.social_clips
    });

  } catch (error) {
    console.error('Error in analyze API:', error);
    return NextResponse.json(
      { error: 'Failed to analyze transcript' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episodeId');

    if (!episodeId) {
      return NextResponse.json({ error: 'Episode ID is required' }, { status: 400 });
    }

    // Verify user owns this episode
    const { data: episode, error: episodeError } = await supabaseAdmin
      .from('episodes')
      .select('id')
      .eq('id', episodeId)
      .eq('user_id', user.id)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    // Get chapters and clips
    const [{ data: chapters }, { data: social_clips }] = await Promise.all([
      supabaseAdmin
        .from('chapters')
        .select('*')
        .eq('episode_id', episodeId)
        .order('chapter_index'),
      supabaseAdmin
        .from('social_clips')
        .select('*')
        .eq('episode_id', episodeId)
        .order('engagement_score', { ascending: false })
    ]);

    return NextResponse.json({
      chapters: chapters || [],
      social_clips: social_clips || []
    });

  } catch (error) {
    console.error('Error in analyze GET API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis' },
      { status: 500 }
    );
  }
} 