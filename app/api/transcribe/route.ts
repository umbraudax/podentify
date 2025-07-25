import { NextRequest, NextResponse } from 'next/server';
import { AssemblyAI } from 'assemblyai';
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';

// Create a Supabase client with service role for server operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize AssemblyAI client
const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!
});

export async function POST(request: NextRequest) {
  try {
    const { transcriptId, filePath } = await request.json();

    if (!transcriptId || !filePath) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get transcript record to verify it exists
    const { data: transcript, error: transcriptError } = await supabaseAdmin
      .from('transcripts')
      .select('id, episode_id')
      .eq('id', transcriptId)
      .single();

    if (transcriptError || !transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Read the audio file
    const audioData = await readFile(filePath);
    
    // Configure transcription parameters
    const transcriptParams = {
      audio: audioData,
      speaker_labels: true, // Enable speaker diarization
      auto_highlights: false,
      punctuate: true,
      format_text: true,
      language_detection: true
    };

    // Submit for transcription
    console.log('Submitting audio to AssemblyAI...');
    const transcriptResponse = await client.transcripts.transcribe(transcriptParams);

    if (transcriptResponse.status === 'error') {
      throw new Error(`Transcription failed: ${transcriptResponse.error}`);
    }

    // Update transcript record with results
    await supabaseAdmin
      .from('transcripts')
      .update({
        full_text: transcriptResponse.text,
        confidence: transcriptResponse.confidence,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', transcriptId);

    // Store individual words with timestamps and speaker labels
    if (transcriptResponse.words && transcriptResponse.words.length > 0) {
      const wordRecords = transcriptResponse.words.map((word, index) => ({
        transcript_id: transcriptId,
        word: word.text,
        start_time: word.start / 1000, // Convert from milliseconds to seconds
        end_time: word.end / 1000,
        confidence: word.confidence,
        speaker: word.speaker ? `Speaker ${word.speaker}` : null,
        word_index: index
      }));

      // Insert words in batches to avoid payload size limits
      const batchSize = 1000;
      for (let i = 0; i < wordRecords.length; i += batchSize) {
        const batch = wordRecords.slice(i, i + batchSize);
        await supabaseAdmin
          .from('transcript_words')
          .insert(batch);
      }
    }

    // Update episode status to completed
    await supabaseAdmin
      .from('episodes')
      .update({ 
        status: 'completed',
        duration: Math.round(transcriptResponse.audio_duration || 0),
        updated_at: new Date().toISOString()
      })
      .eq('id', transcript.episode_id);

    console.log(`Transcription completed for transcript ${transcriptId}`);
    
    return NextResponse.json({ 
      message: 'Transcription completed successfully',
      transcript: {
        id: transcriptId,
        text: transcriptResponse.text,
        confidence: transcriptResponse.confidence,
        words_count: transcriptResponse.words?.length || 0
      }
    });

  } catch (error) {
    console.error('Transcription error:', error);
    
    // Try to update the transcript status to failed
    try {
      const { transcriptId } = await request.json();
      if (transcriptId) {
        await supabaseAdmin
          .from('transcripts')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', transcriptId);

        // Also update episode status
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
    } catch (updateError) {
      console.error('Error updating failed status:', updateError);
    }

    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
} 