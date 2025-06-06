# 🚀 Simplified AI Podcast Clipper Backend (Chunkwise Processor Focused)

This document describes the AI Podcast Clipper backend, which now primarily relies on **`chunkwise_processor.py`**. This processor focuses on **downloading YouTube videos, transcribing them, and enabling virtual chunking** without complex legacy video processing.

## 🔄 What Was Removed (Previously)

These components were part of an older, more complex system and are not in the current `chunkwise_processor.py`:
- **LR-ASD library** - Face detection and speaker identification
- **ASD directory** - Scene detection algorithms
- **OpenCV** - Computer vision processing
- **ffmpegcv** - Advanced video manipulation
- **Complex video resizing** - Vertical video creation with face tracking
- **Face tracking and cropping** - Automatic speaker following
- **Scene detection** - Video content analysis
- **Physical video chunking** (creating separate files for each chunk during initial processing)
- **Standalone YouTube metadata extraction endpoint** (previously in `main.py`)

## ✅ What Remains (in `chunkwise_processor.py`)
- **YouTube video downloading** with yt-dlp
- **Full video transcription** using WhisperX (once per video)
- **Virtual chunking**: Defining chunk boundaries (start/end times) over the original video and its transcript.
- **Re-chunking**: Ability to apply new chunk configurations to already processed videos and their transcripts.
- **Thumbnail generation** from video at specified time offsets.
- **S3 upload** functionality for original videos and potentially thumbnails.
- **FastAPI endpoints** via Modal for API access to the `ChunkwiseProcessor`.

## 📋 Current Dependencies
(Ensure `requirements.txt` is up-to-date with `chunkwise_processor.py` needs)
```txt
tqdm
torch
numpy
scipy
gdown # Review if still needed by chunkwise_processor or its dependencies
pandas # Review if still needed
transformers
accelerate
datasets # Review if still needed
# google-genai removed - was for old pipeline logic not in chunkwise_processor
# pysubs2 removed - was for old pipeline logic not in chunkwise_processor
boto3
fastapi[standard]
whisperx
yt-dlp
requests
```
*Note: Some dependencies listed might be from the older `main.py` setup. Review `chunkwise_processor.py` and `requirements.txt` for actual current needs. `youtube-search-python` and `psycopg2-binary` have been removed.*

## 🏗️ Architecture (`chunkwise_processor.py`)

### Modal Image Configuration (from `chunkwise_processor.py`)
```python
image = (
    modal.Image.from_registry("nvidia/cuda:11.3.1-cudnn8-devel-ubuntu20.04", add_python="3.12")
    .env({"DEBIAN_FRONTEND": "noninteractive", "TZ": "Etc/UTC"})
    .apt_install(["ffmpeg", "libgl1-mesa-glx", "wget"])
    .pip_install_from_requirements("requirements.txt")
)

volume = modal.Volume.from_name("ai-podcast-clipper-model-cache", create_if_missing=True)
mount_path = "/root/.cache/torch"
app = modal.App("chunkwise-processor", image=image)
```

### API Endpoints (served by `chunkwise_processor.py`)

1.  **`POST /process_video_endpoint`**
    -   This is the primary endpoint for all video processing.
    -   Accessible via the URL configured in `env.PROCESS_VIDEO_ENDPOINT`.
    -   Processes YouTube videos or existing S3 videos for virtual chunking and transcription.
    -   Handles initial processing and re-chunking.
    -   Payload for YouTube: `{"youtube_url": "...", "video_id": "...", "chunk_config": {...}}`
    -   Payload for S3 re-chunk: `{"s3_key": "...", "video_id": "...", "chunk_config": {...}, "existing_transcript": [...]}`
    -   Returns: Video info, S3 key, chunk metadata, full transcript.

2.  **`POST /generate_thumbnail`**
    -   Generates a thumbnail from a video URL or S3 key at a specific time offset.
    -   Payload: `{"video_url": "...", "time_offset": ..., "width": ..., "height": ..., "output_format": "jpeg/png"}`
    -   Requires auth token passed as `Bearer <env.PROCESS_VIDEO_ENDPOINT_AUTH>`.
    -   Returns: Thumbnail image bytes.

## 🔧 Core Methods in `ChunkwiseProcessor` (from `chunkwise_processor.py`)

### `process_youtube_video(request_data: dict)`
- Downloads YouTube video.
- Uploads original to S3.
- Transcribes the full video.
- Generates virtual chunk metadata based on `chunk_config`.
- Returns structured data including transcript and chunk definitions.

### `process_s3_video(request_data: dict)`
- Used for re-chunking existing S3 videos.
- Takes an S3 key, new `chunk_config`, and optionally an existing transcript.
- Generates new virtual chunk metadata.
- Does not re-transcribe if a transcript is provided.

### `generate_thumbnail(request_data: dict)`
- Downloads video (if URL) or uses S3 path.
- Extracts a frame using FFmpeg at `time_offset`.
- Returns image data.

## 🚀 Deployment

### 1. Environment Setup
```bash
cd ai-podcast-clipper-backend
# Ensure Python environment (e.g., venv) is active and requirements installed
# source venv/bin/activate 
# pip install -r requirements.txt
```

### 2. Deploy to Modal
```bash
modal serve chunkwise_processor.py 
```
*(The deployed application URL should be configured as `PROCESS_VIDEO_ENDPOINT` in your frontend environment. The auth token used by `chunkwise_processor.py` (from Modal secrets) should be configured as `PROCESS_VIDEO_ENDPOINT_AUTH` in your frontend environment for client-side calls or Inngest functions that call this endpoint.)*

### 3. Required Modal Secrets
Set up these secrets in your Modal dashboard for the `chunkwise-processor` app:
- `AUTH_TOKEN` - API authentication token used internally by the Modal app for its endpoints.
- `AWS_ACCESS_KEY_ID` - AWS S3 access.
- `AWS_SECRET_ACCESS_KEY` - AWS S3 secret.
- *Review `chunkwise_processor.py` for any other secrets it might require (e.g., if any AI services for moment identification were re-introduced there).*

## 📊 Performance Benefits (of current `chunkwise_processor.py` approach)

### Resource Usage
- **GPU**: T4 (as specified in `chunkwise_processor.py`) for WhisperX.
- **Processing Time**: Efficient transcription (once per video), fast re-chunking.

### Processing Pipeline (Conceptual for `chunkwise_processor.py`)
```
YouTube URL/S3 Key → yt-dlp Download (if URL) → Full Transcription (WhisperX) → 
Virtual Chunk Definition → S3 Upload (Original Video) → Thumbnail Generation (on demand)
```

## 🧪 Testing

### Modal Testing (Example for `chunkwise_processor.py`)
Ensure `chunkwise_processor.py` is served via Modal. Configure its URL as `PROCESS_VIDEO_ENDPOINT` and its auth token as `PROCESS_VIDEO_ENDPOINT_AUTH` in your testing environment (e.g., `.env` file for local test scripts).

**Test Video Processing (YouTube):**
```bash
# Replace YOUR_PROCESS_VIDEO_ENDPOINT_URL and YOUR_PROCESS_VIDEO_ENDPOINT_AUTH_TOKEN
curl -X POST "YOUR_PROCESS_VIDEO_ENDPOINT_URL" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_PROCESS_VIDEO_ENDPOINT_AUTH_TOKEN" \\
  -d \'{
    "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "video_id": "some-unique-video-id-123",
    "chunk_config": {"method": "minutes", "minutesPerChunk": 5}
  }\'
```

**Test Thumbnail Generation:**
```bash
# Replace YOUR_PROCESS_VIDEO_ENDPOINT_URL and YOUR_PROCESS_VIDEO_ENDPOINT_AUTH_TOKEN
# The /generate_thumbnail path is appended to your base PROCESS_VIDEO_ENDPOINT_URL if it points to the root of the Modal app.
# Or, if PROCESS_VIDEO_ENDPOINT is the full path to /process_video_endpoint, then construct the thumbnail URL accordingly.
# Assuming PROCESS_VIDEO_ENDPOINT is the base URL for the Modal app:
THUMBNAIL_ENDPOINT_URL="$(echo $PROCESS_VIDEO_ENDPOINT | sed 's/[^/]*$/generate_thumbnail/')"

curl -X POST "$THUMBNAIL_ENDPOINT_URL" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_PROCESS_VIDEO_ENDPOINT_AUTH_TOKEN" \\
  -d \'{
    "video_url": "https://link-to-your-video.mp4", 
    "time_offset": 10,
    "width": 640,
    "height": 360
  }\' --output test_thumb.jpg
```
*(Note: `test_simplified.py` and other old test scripts related to `main.py` are likely obsolete.)*

## 🔍 Troubleshooting

### Common Issues
1.  **yt-dlp Download Failures** (in `chunkwise_processor.py`)
    -   Check YouTube URL validity.
    -   Ensure video is publicly accessible.
2.  **Modal Deployment Issues** (for `chunkwise_processor.py`)
    -   Verify all necessary secrets are set in Modal.
    -   Check `requirements.txt` for package compatibility.
    -   Monitor Modal build and runtime logs for `chunkwise-processor` app.
3.  **FFmpeg Errors**
    -   Ensure input video format is supported by FFmpeg.
    -   Check disk space in Modal container\'s `/tmp` if large files are processed.

### Debug Commands
```bash
# Test yt-dlp locally (if Python env is set up)
python -c "import yt_dlp; print(yt_dlp.version.__version__)"
```

## 🎯 Next Steps (General)
1.  **Frontend Integration**: Ensure frontend exclusively uses `chunkwise_processor.py` endpoints via `env.PROCESS_VIDEO_ENDPOINT` and `env.PROCESS_VIDEO_ENDPOINT_AUTH`.
2.  **Error Handling**: Enhance error handling in `chunkwise_processor.py`.
3.  **Monitoring & Logging**: Implement robust logging for the `chunkwise-processor` Modal app.
4.  **Dependency Review**: Clean up `requirements.txt` based on actual needs of `chunkwise_processor.py` (e.g. `gdown`, `pandas`, `pyannote.audio`, `datasets`, `tqdm`).
5.  **Testing**: Develop specific tests for `chunkwise_processor.py` methods and endpoints.

This document reflects the backend refocused on `chunkwise_processor.py` for a maintainable and resource-efficient video processing pipeline. 