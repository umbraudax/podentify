## Storage Migration Notes

- Media files are now stored in Supabase Storage private bucket `user-uploads` under `userId/objectName`.
- API routes `/api/audio/[userId]/[filename]` and `/api/video/[userId]/[filename]` authorize requests and 302-redirect to short-lived signed URLs from storage (no file buffering on server).
- Uploads are validated by MIME (magic bytes) and uploaded directly to storage; the database stores `storage_key` for each episode.
- Local `uploads/` is no longer used and is gitignored.
podtentify
