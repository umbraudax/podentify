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
      const cookieHeader = request.headers.get('cookie');
      const cookies = new Map<string, string>();
      
      if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
          const [name, value] = cookie.trim().split('=');
          if (name && value) {
            cookies.set(name, decodeURIComponent(value));
          }
        });
      }

      // Try different token formats from cookies
      const tokenKeys = [
        'sb-access-token',
        'supabase-auth-token',
        'supabase.auth.token'
      ];

      for (const tokenKey of tokenKeys) {
        const cookieToken = cookies.get(tokenKey);
        if (cookieToken) {
          try {
            // Token might be JSON stringified
            let token = cookieToken;
            if (cookieToken.startsWith('"') && cookieToken.endsWith('"')) {
              token = cookieToken.slice(1, -1);
            }

            const { data: { user: cookieUser }, error: cookieError } = await supabaseAdmin.auth.getUser(token);
            if (!cookieError && cookieUser) {
              user = cookieUser;
              break;
            }
          } catch (parseError) {
            // Continue to next token format
            continue;
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
      .eq('audio_url', `/api/video/${userId}/${filename}`)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check if user has access to this episode
    if (episode.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!episode.storage_key) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const { data: signed, error: signedErr } = await supabaseAdmin.storage
      .from('user-uploads')
      .createSignedUrl(episode.storage_key, 60 * 10, {
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