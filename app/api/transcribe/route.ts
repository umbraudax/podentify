import { NextRequest, NextResponse } from 'next/server';
import { AssemblyAI } from 'assemblyai';  
import { createClient } from '@supabase/supabase-js';
import { unlink } from 'fs/promises';
import { deductCredits, calculateTranscriptionCredits } from '@/lib/credit-service';

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

    // Ensure provider API key exists
    if (!process.env.ASSEMBLYAI_API_KEY) {
      console.error('Missing ASSEMBLYAI_API_KEY');
      return NextResponse.json({ error: 'Transcription not configured' }, { status: 500 });
    }

    // Create a signed URL for AssemblyAI to fetch directly from Supabase Storage
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from('user-uploads')
      .createSignedUrl(filePath, 60 * 60 * 24); // 24 hours TTL to avoid expiry during queue
    if (signErr || !signed?.signedUrl) {
      console.error('Failed to create signed URL for transcription:', signErr);
      return NextResponse.json({ error: 'Failed to start transcription' }, { status: 500 });
    }

    // Queue transcription with webhook callback
    const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const appUrl = rawAppUrl
      ? (/^https?:\/\//i.test(rawAppUrl) ? rawAppUrl.replace(/\/$/, '') : `https://${rawAppUrl.replace(/\/$/, '')}`)
      : '';
    const webhookUrl = appUrl
      ? `${appUrl}/api/transcribe/webhook?tid=${encodeURIComponent(transcriptId)}&uid=${encodeURIComponent(userId)}`
      : undefined;
    console.log('Signed URL TTL 24h created for', filePath, 'len:', signed.signedUrl.length, 'webhook:', webhookUrl || '(none)');

    const createRes = await client.transcripts.create({
      audio_url: signed.signedUrl,
      speaker_labels: true,
      auto_highlights: false,
      punctuate: true,
      format_text: true,
      language_detection: true,
      webhook_url: webhookUrl,
    } as any);

    console.log('AssemblyAI transcription queued for transcript', transcriptId, 'providerId:', (createRes as any)?.id);
    return NextResponse.json({ message: 'Transcription queued', queued: true }, { status: 202 });

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