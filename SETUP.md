# Podtentify Setup Guide

This guide will help you set up Podtentify with all the required environment variables and dependencies for the podcast transcription feature.

## Prerequisites

1. **Node.js** (version 16 or higher)
2. **Supabase account** with a project set up
3. **AssemblyAI account** with API access
4. **Stripe account** (optional, for payments)

## Environment Variables

Create a `.env.local` file in your project root with the following variables:

### Required Variables

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AssemblyAI Configuration (Required for transcription)
ASSEMBLYAI_API_KEY=your_assemblyai_api_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Optional Variables (for Stripe integration)

```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

## Setup Steps

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings** → **API** in your Supabase dashboard
3. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### 2. AssemblyAI Setup

1. Sign up at [assemblyai.com](https://www.assemblyai.com/)
2. Go to your dashboard and find your API key
3. Copy the API key → `ASSEMBLYAI_API_KEY`

### 3. Database Migration

The database tables have already been created with the migration. If you need to apply it manually:

```bash
npx supabase db push --include-all
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Start Development Server

```bash
npm run dev
```

## How the Transcription Pipeline Works

1. **User Registration**: When users sign up, a database trigger automatically creates their profile record
2. **File Upload**: User uploads an audio file through the dashboard
3. **Secure Storage**: File is stored in `/uploads/{userId}/` directory on the server
4. **Database Record**: Episode record is created with status 'uploading'
5. **AssemblyAI Processing**: File is sent to AssemblyAI for transcription with speaker diarization
6. **Data Storage**: Transcript and individual word timestamps are stored in the database
7. **Interactive UI**: User can click on any word in the transcript to jump to that time in the audio

## File Structure

```
app/
├── api/
│   ├── upload/route.ts          # Handles file uploads
│   ├── transcribe/route.ts      # Processes transcription
│   └── audio/[userId]/[filename]/route.ts  # Serves audio files securely
├── dashboard/
│   ├── page.tsx                 # Main dashboard with upload
│   └── episode/[id]/page.tsx    # Episode processing/viewing page
├── supabase/migrations/
│   └── 20250126000001_add_transcripts_table.sql  # Database schema
└── lib/
    ├── database.types.ts        # TypeScript types for database
    └── types.ts                 # Application types
```

## Features

### Audio Player
- Play/pause controls
- Skip forward/backward (10 seconds)
- Volume control
- Progress scrubbing
- Time display

### Interactive Transcript
- **Speaker Diarization**: Different speakers shown in different colors
- **Word-level Timestamps**: Click any word to jump to that time in audio
- **Visual Feedback**: Current word highlighted while playing
- **Hover Effects**: Words highlight on hover to show they're clickable

### Security
- **User Authentication**: All uploads tied to authenticated users
- **Secure File Serving**: Audio files served with authorization checks
- **Database Security**: Row Level Security (RLS) policies ensure users only access their own data

## Troubleshooting

### Common Issues

1. **"Unauthorized" errors**: Check your Supabase service role key
2. **"Failed to create episode record"**: This usually means a user profile wasn't created properly
   - The latest migration should fix this automatically
   - If you still see this error, check your database triggers are working
3. **Transcription fails**: Verify your AssemblyAI API key is correct
4. **File not found**: Ensure the uploads directory is writable
5. **Database errors**: Make sure migrations have been applied

### File Upload Limits

- **Maximum file size**: 500MB
- **Supported formats**: MP3, WAV, M4A
- **Storage location**: `/uploads/{userId}/` directory

### AssemblyAI Limits

- Check your AssemblyAI usage quotas
- Processing time varies based on audio length
- Speaker diarization works best with clear audio

## Support

For issues or questions:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure your Supabase project has the correct tables and policies
4. Test with smaller audio files first

## Next Steps

Once everything is working:
1. Consider adding progress indicators for long transcriptions
2. Implement retry logic for failed transcriptions
3. Add export functionality for transcripts
4. Set up proper error monitoring and logging 