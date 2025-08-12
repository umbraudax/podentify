import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with service role for server operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string; filename: string } }
) {
  try {
    const { userId, filename } = params;
    
    let user = null;
    
    // Try multiple authentication methods
    // 1. Check Authorization header
    if (!user) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user: headerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (!authError && headerUser) {
          user = headerUser;
        }
      }
    }
    
    // 2. Check all possible cookie formats if no auth header
    if (!user) {
      const cookies = request.cookies;
      const cookieNames = [
        'sb-access-token',
        'supabase-auth-token', 
        'sb-refresh-token',
        'supabase.auth.token'
      ];
      
      for (const cookieName of cookieNames) {
        const cookieValue = cookies.get(cookieName)?.value;
        if (cookieValue) {
          try {
            // Try parsing as JSON first (some cookies store JSON)
            let token = cookieValue;
            try {
              const parsed = JSON.parse(cookieValue);
              token = parsed.access_token || parsed.token || cookieValue;
            } catch {
              // Use cookie value as-is if not JSON
            }
            
            const { data: { user: cookieUser }, error } = await supabaseAdmin.auth.getUser(token);
            if (!error && cookieUser) {
              user = cookieUser;
              break;
            }
          } catch (e) {
            console.log(`Failed to authenticate with cookie ${cookieName}:`, e);
          }
        }
      }
    }
    
    // 3. Check all cookies that contain 'supabase' or 'sb-'
     if (!user) {
      const allCookies = request.cookies.getAll();
      for (const cookie of allCookies) {
        if (cookie.name.toLowerCase().includes('supabase') || cookie.name.startsWith('sb-')) {
          try {
            let token = cookie.value;
            // Try parsing as JSON
            try {
              const parsed = JSON.parse(cookie.value);
              token = parsed.access_token || parsed.token || cookie.value;
            } catch {
              // Use cookie value as-is
            }
            
            const { data: { user: cookieUser }, error } = await supabaseAdmin.auth.getUser(token);
            if (!error && cookieUser) {
              user = cookieUser;
              break;
            }
          } catch (e) {
            // Continue trying other cookies
          }
        }
      }
    }
    
    if (!user) {
      // Debug: Log available cookies for troubleshooting
      const allCookies = request.cookies.getAll();
      console.log('Authentication failed. Available cookies:', allCookies.map(c => c.name));
      console.log('Request headers:', Object.fromEntries(request.headers.entries()));
      
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorize and fetch storage key
    const { data: episode, error: episodeError } = await supabaseAdmin
      .from('episodes')
      .select('user_id, storage_key')
      .eq('audio_url', `/api/audio/${userId}/${filename}`)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check if user has access to this episode
    if (episode.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate short‑lived signed download URL and redirect
    if (!episode.storage_key) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const { data: signed, error: signedErr } = await supabaseAdmin.storage
      .from('user-uploads')
      .createSignedUrl(episode.storage_key, 60 * 10, {  // 10 minutes
        download: filename,
      });

    if (signedErr || !signed?.signedUrl) {
      console.error('Failed to create signed URL:', signedErr);
      return NextResponse.json({ error: 'Failed to sign media URL' }, { status: 500 });
    }

    return NextResponse.redirect(signed.signedUrl, 302);

  } catch (error) {
    console.error('File serving error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Authorization, Content-Type',
    },
  });
} 