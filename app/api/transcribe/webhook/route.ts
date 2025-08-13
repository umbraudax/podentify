import { NextRequest, NextResponse } from 'next/server';
import { AssemblyAI } from 'assemblyai';
import { createClient } from '@supabase/supabase-js';
import { calculateTranscriptionCredits, deductCredits } from '@/lib/credit-service';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize AssemblyAI client for fallback fetches when webhook payload is minimal
const assemblyClient = process.env.ASSEMBLYAI_API_KEY
  ? new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY })
  : undefined;

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const transcriptId = url.searchParams.get('tid') || undefined;
    const userId = url.searchParams.get('uid') || undefined;

    if (!transcriptId || !userId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    // Optional verification: accept without secret to avoid proxy header stripping on some hosts

    const payload = await request.json();
    const status = (payload?.status as string) || 'unknown';
    const providerTranscriptId = payload?.id || payload?.transcript_id || payload?.transcriptId;
    console.log('Webhook payload for transcript', transcriptId, 'status:', status, 'providerId:', providerTranscriptId || '(missing)');

    // Fetch transcript row for episode mapping
    const { data: transcriptRow, error: trErr } = await supabaseAdmin
      .from('transcripts')
      .select('id, episode_id, status')
      .eq('id', transcriptId)
      .single();

    if (trErr || !transcriptRow) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Ignore if no longer processing (idempotency)
    if (transcriptRow.status !== 'processing') {
      return NextResponse.json({ message: `Already ${transcriptRow.status}` }, { status: 200 });
    }

    if (status === 'completed' || status === 'queued' || status === 'processing') {
      if (status !== 'completed') {
        // Acknowledge non-final statuses without changing DB state
        return NextResponse.json({ message: status });
      }
      
      let text: string | undefined = payload?.text;
      let confidence: number | undefined = payload?.confidence;
      let audioDuration: number = Math.round(payload?.audio_duration || 0);
      let words: any[] | undefined = Array.isArray(payload?.words) ? payload.words : undefined;

      // Fallback: Some AssemblyAI webhooks do not include full text/words. Fetch the final transcript if needed.
      if ((!text || text.trim().length === 0 || !words) && assemblyClient && providerTranscriptId) {
        try {
          const finalTx = await assemblyClient.transcripts.get(providerTranscriptId as string);
          if (finalTx) {
            if (!text || text.trim().length === 0) text = (finalTx as any).text;
            if (!confidence && typeof (finalTx as any).confidence === 'number') confidence = (finalTx as any).confidence;
            if ((!audioDuration || audioDuration <= 0) && typeof (finalTx as any).audio_duration === 'number') {
              audioDuration = Math.round((finalTx as any).audio_duration || 0);
            }
            if (!words && Array.isArray((finalTx as any).words)) {
              words = (finalTx as any).words;
            }
          }
        } catch (fetchErr) {
          console.error('Failed to fetch final transcript from AssemblyAI:', fetchErr);
        }
      }

      // If still no transcript text after fallback, treat as failure rather than completing with empty text
      if (!text || text.trim().length === 0) {
        console.error('Completed webhook but no transcript text present. Marking as failed.', {
          providerTranscriptId,
          audioDuration,
        });
        await supabaseAdmin.from('transcripts').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', transcriptId);
        await supabaseAdmin.from('episodes').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', transcriptRow.episode_id);
        return NextResponse.json({ error: 'Transcript empty' }, { status: 422 });
      }

      const durationMinutes = Math.ceil((audioDuration || 0) / 60);
      const creditsNeeded = calculateTranscriptionCredits(durationMinutes);

      // Deduct credits
      const ok = await deductCredits(userId, creditsNeeded);
      if (!ok) {
        await supabaseAdmin.from('transcripts').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', transcriptId);
        await supabaseAdmin.from('episodes').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', transcriptRow.episode_id);
        return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
      }

      // Update transcript and words
      await supabaseAdmin
        .from('transcripts')
        .update({
          full_text: text || null,
          confidence: confidence || null,
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', transcriptId);

      // Optional: words if provided by webhook
      if (Array.isArray(words) && words.length > 0) {
        const wordRecords = (words as any[]).map((w: any, idx: number) => ({
          transcript_id: transcriptId,
          word: w.text,
          start_time: (w.start || 0) / 1000,
          end_time: (w.end || 0) / 1000,
          confidence: w.confidence ?? null,
          speaker: w.speaker ? `Speaker ${w.speaker}` : null,
          word_index: idx,
        }));
        const batchSize = 1000;
        for (let i = 0; i < wordRecords.length; i += batchSize) {
          const batch = wordRecords.slice(i, i + batchSize);
          await supabaseAdmin.from('transcript_words').insert(batch);
        }
      }

      await supabaseAdmin
        .from('episodes')
        .update({ status: 'completed', duration: audioDuration, updated_at: new Date().toISOString() })
        .eq('id', transcriptRow.episode_id);

      return NextResponse.json({ message: 'ok' });
    }

    if (status === 'error' || status === 'failed' || status === 'canceled') {
      console.error('Webhook reported failure:', payload?.error || payload);
      await supabaseAdmin.from('transcripts').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', transcriptId);
      await supabaseAdmin.from('episodes').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', transcriptRow.episode_id);
      return NextResponse.json({ message: 'failed' });
    }

    // still processing
    return NextResponse.json({ message: 'processing' });
  } catch (e) {
    console.error('Transcription webhook error:', e);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}


