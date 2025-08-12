import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Auth via Authorization: Bearer
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch episode and storage key
    const { data: episode, error } = await supabaseAdmin
      .from('episodes')
      .select('id, user_id, title, storage_key')
      .eq('id', id)
      .single();

    if (error || !episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    if (episode.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!episode.storage_key) {
      return NextResponse.json({ error: 'No media storage key' }, { status: 404 });
    }

    // Create signed URL (10 minutes)
    const filename = episode.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'media';
    const { data: signed, error: signedErr } = await supabaseAdmin.storage
      .from('user-uploads')
      .createSignedUrl(episode.storage_key, 60 * 10, { download: filename });

    if (signedErr || !signed?.signedUrl) {
      return NextResponse.json({ error: 'Failed to sign media URL' }, { status: 500 });
    }

    const res = NextResponse.json({ url: signed.signedUrl });
    res.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
    res.headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
    return res;
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}


