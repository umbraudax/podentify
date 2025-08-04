import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { getMimeType } from '@/lib/utils';

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
    // 1. Check URL query parameter first (for video element requests)
    const url = new URL(request.url);
    const tokenParam = url.searchParams.get('token');
    if (tokenParam) {
      const { data: { user: paramUser }, error: paramError } = await supabaseAdmin.auth.getUser(tokenParam);
      if (!paramError && paramUser) {
        user = paramUser;
      }
    }
    
    // 2. Check Authorization header
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
    
    // 3. Check all possible cookie formats if no auth header or token param
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

    // Check if the user is authorized to access this file
    // Either they own the file or have access through episode sharing
    const { data: episode, error: episodeError } = await supabaseAdmin
      .from('episodes')
      .select('user_id')
      .eq('audio_url', `/api/video/${userId}/${filename}`)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check if user has access to this episode
    if (episode.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Construct file path
    const filePath = path.join(process.cwd(), 'uploads', userId, filename);
    
    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Read file
    const fileBuffer = await readFile(filePath);
    
    // Determine content type based on file extension
    const contentType = getMimeType(filename);

    // Handle range requests for video streaming
    const range = request.headers.get('range');
    
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileBuffer.length - 1;
      const chunksize = (end - start) + 1;
      const chunk = fileBuffer.slice(start, end + 1);
      
      return new NextResponse(chunk, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileBuffer.length}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': contentType,
          'Cache-Control': 'private, max-age=3600',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range, Authorization, Content-Type',
        },
      });
    }

    // Return full file with proper headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Authorization, Content-Type',
      },
    });

  } catch (error) {
    console.error('File serving error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Authorization, Content-Type',
    },
  });
} 