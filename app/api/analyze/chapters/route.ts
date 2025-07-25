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

    // Delete existing chapters for regeneration
    await supabaseAdmin
      .from('chapters')
      .delete()
      .eq('episode_id', episodeId);

    // Analyze with Gemini AI - chapters only
    console.log('Generating chapters with Gemini AI...');
    const analysisResult = await geminiService.analyzeTranscript(
      transcript.full_text || '',
      transcriptWords
    );

    // Save only chapters to database
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
        return NextResponse.json({ error: 'Failed to save chapters' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Chapters generated successfully',
      chapters: analysisResult.chapters
    });

  } catch (error) {
    console.error('Error in chapters API:', error);
    return NextResponse.json(
      { error: 'Failed to generate chapters' },
      { status: 500 }
    );
  }
} 