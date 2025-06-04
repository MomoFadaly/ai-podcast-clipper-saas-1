# Chunkwise S3 Setup Documentation

## Overview
Chunkwise uses the existing `ai-podcast-clipper` S3 bucket but with a separate `chunkwise/` folder to keep files isolated from the original podcast clipper project.

## S3 Folder Structure

```
ai-podcast-clipper/
├── {existing podcast clipper files...}
└── chunkwise/
    └── videos/
        └── {videoId}/
            ├── original.mp4          # Downloaded YouTube video
            ├── chunks/
            │   ├── chunk-1.mp4       # First segment (0-10min)
            │   ├── chunk-2.mp4       # Second segment (10-20min)
            │   └── chunk-N.mp4       # Additional segments
            └── thumbnails/
                ├── video-thumb.jpg   # Main video thumbnail
                ├── chunk-1-thumb.jpg # Thumbnail for chunk 1
                └── chunk-N-thumb.jpg # Thumbnails for other chunks
```

## Environment Variables

Add these to your `.env` file:

```env
# Existing S3 configuration (reused)
AWS_ACCESS_KEY_ID=your_existing_key
AWS_SECRET_ACCESS_KEY=your_existing_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=ai-podcast-clipper

# New Chunkwise endpoints
CHUNKWISE_PROCESS_VIDEO_ENDPOINT=https://your-modal-app.modal.run/process_video_endpoint
CHUNKWISE_PROCESS_VIDEO_ENDPOINT_AUTH=your_chunkwise_auth_token

# Supabase (for Chunkwise database)
NEXT_PUBLIC_SUPABASE_URL=https://etxxieezqagxhklooidq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Key Implementation Files

### Frontend
- `src/actions/chunkwise-s3.ts` - S3 utilities with `chunkwise/` prefix
- `src/inngest/chunkwise-functions.ts` - Queue processing functions
- `src/env.js` - Updated environment variables

### Backend
- `ai-podcast-clipper-backend/chunkwise_processor.py` - New Modal app for Chunkwise

## S3 Key Examples

All Chunkwise files use the `chunkwise/` prefix:

```
chunkwise/videos/550e8400-e29b-41d4-a716-446655440000/original.mp4
chunkwise/videos/550e8400-e29b-41d4-a716-446655440000/chunks/chunk-1.mp4
chunkwise/videos/550e8400-e29b-41d4-a716-446655440000/thumbnails/video-thumb.jpg
```

## Key Functions

### S3 Utilities (`chunkwise-s3.ts`)
- `generateChunkwiseS3Key(path)` - Adds `chunkwise/` prefix
- `generateChunkUploadUrl()` - Signed URLs for chunk uploads
- `getChunkPlayUrl()` - Signed URLs for chunk playback
- `listVideoChunks()` - List all chunks for a video
- `extractVideoIdFromS3Key()` - Parse video ID from S3 key

### Processing Pipeline
1. **YouTube Download** - Backend downloads video using yt-dlp
2. **Original Upload** - Full video uploaded to `chunkwise/videos/{id}/original.mp4`
3. **Chunking** - Video split into fixed-duration segments using ffmpeg
4. **Chunk Upload** - Each segment uploaded to `chunkwise/videos/{id}/chunks/`
5. **Transcription** - WhisperX processes each chunk for transcript
6. **Database Update** - Supabase updated with chunk metadata

## Cost Benefits
- **Reuses existing S3 bucket** and IAM permissions
- **Same AWS credentials** and configuration
- **Isolated file storage** with folder-based separation
- **No additional S3 setup** required

## Migration Path
1. Deploy new backend processor to Modal
2. Update frontend with new S3 utilities  
3. Configure environment variables
4. Test with sample YouTube video
5. Deploy Inngest functions for queue processing

## Testing
Use the local entrypoint in `chunkwise_processor.py`:
```bash
modal run chunkwise_processor.py::main
```

This will test the full pipeline with a short YouTube video and verify S3 uploads work correctly with the `chunkwise/` prefix. 