import { NextRequest, NextResponse } from 'next/server';
import { AssemblyAI } from 'assemblyai';
import { createClient } from '@supabase/supabase-js';
import { calculateTranscriptionCredits, deductCredits } from '@/lib/credit-service';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const transcriptId = url.searchParams.get('tid') || undefined;
    const userId = url.searchParams.get('uid') || undefined;

    if (!transcriptId || !userId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    // Optional: verify webhook secret
    const expected = process.env.ASSEMBLYAI_WEBHOOK_SECRET;
    if (expected) {
      const provided = request.headers.get('x-webhook-secret');
      if (provided !== expected) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const payload = await request.json();
    console.log('Webhook payload for transcript', transcriptId, 'status:', payload?.status);
    const status = payload.status as string;

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

    if (status === 'completed') {
      const text: string | undefined = payload.text;
      const confidence: number | undefined = payload.confidence;
      const audioDuration: number = Math.round(payload.audio_duration || 0);

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
      if (Array.isArray(payload.words) && payload.words.length > 0) {
        const wordRecords = (payload.words as any[]).map((w: any, idx: number) => ({
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

    if (status === 'error' || status === 'failed') {
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


