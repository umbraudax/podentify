import { NextRequest, NextResponse } from 'next/server';
import { AssemblyAI } from 'assemblyai';  
import { createClient } from '@supabase/supabase-js';
import { readFile, unlink } from 'fs/promises';
import { deductCredits, calculateTranscriptionCredits } from '@/lib/credit-service';
import { existsSync } from 'fs';
import { createClient as createSbClient } from '@supabase/supabase-js';

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
  let transcriptId: string | undefined;
  let transcript: { id: string; episode_id: string } | undefined;

  try {
    const { transcriptId: requestTranscriptId, filePath, userId, shouldCleanup } = await request.json();
    transcriptId = requestTranscriptId;

    if (!transcriptId || !filePath || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get transcript record to verify it exists
    const { data: transcriptData, error: transcriptError } = await supabaseAdmin
      .from('transcripts')
      .select('id, episode_id, status')
      .eq('id', transcriptId)
      .single();

    if (transcriptError || !transcriptData) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    transcript = transcriptData as any;

    // Idempotency guard: if already completed/failed, do nothing
    if ((transcriptData as any).status && (transcriptData as any).status !== 'processing') {
      return NextResponse.json({ message: `Transcript already ${ (transcriptData as any).status }` });
    }

    // Read the audio file
    let audioData: Buffer;
    if (filePath.startsWith('uploads/') || filePath.startsWith('/') || filePath.includes('uploads/')) {
      // Backward compatibility: local path used earlier; if exists, read from disk
      if (existsSync(filePath)) {
        audioData = await readFile(filePath);
      } else {
        // Otherwise, treat as storage key
        const storage = createSbClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data, error } = await storage.storage.from('user-uploads').download(filePath);
        if (error || !data) throw error || new Error('Failed to download from storage');
        const arr = await data.arrayBuffer();
        audioData = Buffer.from(arr);
      }
    } else {
      // Treat as storage key
      const storage = createSbClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data, error } = await storage.storage.from('user-uploads').download(filePath);
      if (error || !data) throw error || new Error('Failed to download from storage');
      const arr = await data.arrayBuffer();
      audioData = Buffer.from(arr);
    }
    
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

    // Calculate actual credits needed based on duration
    const durationMinutes = Math.ceil((transcriptResponse.audio_duration || 0) / 60);
    const creditsNeeded = calculateTranscriptionCredits(durationMinutes);

    // Deduct credits from user account
    const creditDeducted = await deductCredits(userId, creditsNeeded);
    
    if (!creditDeducted) {
      // If we can't deduct credits, mark the transcript as failed
      await supabaseAdmin
        .from('transcripts')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', transcriptId);

      await supabaseAdmin
        .from('episodes')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', transcript.episode_id);

      return NextResponse.json({ 
        error: 'Insufficient credits for transcription',
        required_credits: creditsNeeded
      }, { status: 402 });
    }

    // Update transcript record with results
    console.log('🔄 Updating transcript in database...', {
      transcriptId,
      hasText: !!transcriptResponse.text,
      textLength: transcriptResponse.text?.length,
      confidence: transcriptResponse.confidence,
      creditsNeeded
    });

    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('transcripts')
      .update({
        full_text: transcriptResponse.text,
        confidence: transcriptResponse.confidence,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', transcriptId)
      .select(); // Add select to see what was updated

    if (updateError) {
      console.error('❌ Failed to update transcript:', updateError);
      throw updateError;
    }

    console.log('✅ Transcript updated successfully:', updateData);

    // Store individual words with timestamps and speaker labels
    if (transcriptResponse.words && transcriptResponse.words.length > 0) {
      console.log(`🔤 Inserting ${transcriptResponse.words.length} words...`);
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
        const { error: wordsError } = await supabaseAdmin
          .from('transcript_words')
          .insert(batch);

        if (wordsError) {
          console.error(`❌ Failed to insert word batch ${i}-${i + batchSize}:`, wordsError);
          throw wordsError;
        }
      }
      console.log('✅ All words inserted successfully');
    }

    // Update episode status to completed
    console.log('🔄 Updating episode status to completed...');
    const { data: episodeUpdateData, error: episodeUpdateError } = await supabaseAdmin
      .from('episodes')
      .update({ 
        status: 'completed',
        duration: Math.round(transcriptResponse.audio_duration || 0),
        updated_at: new Date().toISOString()
      })
      .eq('id', transcript.episode_id)
      .select();

    if (episodeUpdateError) {
      console.error('❌ Failed to update episode:', episodeUpdateError);
      throw episodeUpdateError;
    }

    console.log('✅ Episode updated successfully:', episodeUpdateData);

    console.log(`Transcription completed for transcript ${transcriptId}, ${creditsNeeded} credits deducted`);
    
    // Clean up extracted audio file if it was created from video
    if (shouldCleanup && existsSync(filePath)) {
      try {
        await unlink(filePath);
        console.log(`Cleaned up extracted audio file: ${filePath}`);
      } catch (cleanupError) {
        console.error('Error cleaning up extracted audio:', cleanupError);
        // Don't fail the whole process for cleanup errors
      }
    }
    
    return NextResponse.json({ 
      message: 'Transcription completed successfully',
      transcript: {
        id: transcriptId,
        text: transcriptResponse.text,
        confidence: transcriptResponse.confidence,
        words_count: transcriptResponse.words?.length || 0,
        duration_minutes: durationMinutes
      },
      credits_deducted: creditsNeeded
    });

  } catch (error) {
    console.error('Transcription error:', error);
    
    // Try to update the transcript status to failed
    try {
      if (transcriptId) {
        await supabaseAdmin
          .from('transcripts')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', transcriptId);

        // Also update episode status if we have the transcript info
        if (transcript?.episode_id) {
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