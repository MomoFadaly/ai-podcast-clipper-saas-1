import json
import pathlib
import shutil
import subprocess
import time
import uuid
import boto3
import modal
import os
import requests
from fastapi import Depends, HTTPException, status, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import openai
import yt_dlp

# Modal image setup with required dependencies
image = (
    modal.Image.from_registry("nvidia/cuda:11.3.1-cudnn8-devel-ubuntu20.04", add_python="3.12")
    .env({"DEBIAN_FRONTEND": "noninteractive", "TZ": "Etc/UTC"})
    .apt_install(["ffmpeg", "libgl1-mesa-glx", "wget", "git"])
    .pip_install_from_requirements("requirements.txt")
)

# Modal app setup
volume = modal.Volume.from_name("ai-podcast-clipper-model-cache", create_if_missing=True)
mount_path = "/root/.cache/torch"
app = modal.App("chunkwise-processor", image=image)

# Constants
CHUNKWISE_S3_PREFIX = "chunkwise/"
S3_BUCKET_NAME = "ai-podcast-clipper"  # Reusing existing bucket

# Authentication
auth_scheme = HTTPBearer()

def generate_chunkwise_s3_key(path: str) -> str:
    """Generate S3 key with chunkwise prefix"""
    return f"{CHUNKWISE_S3_PREFIX}{path}"

def download_youtube_video(youtube_url: str, output_path: str) -> dict:
    """Download YouTube video using yt-dlp"""
    ydl_opts = {
        'format': 'best[ext=mp4]/best',
        'outtmpl': str(output_path),
        'noplaylist': True,
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        # Extract video info
        info = ydl.extract_info(youtube_url, download=False)
        
        # Download the video
        ydl.download([youtube_url])
        
        return {
            'title': info.get('title', 'Unknown'),
            'description': info.get('description', ''),
            'duration': info.get('duration', 0),
            'thumbnail': info.get('thumbnail', ''),
            'youtube_id': info.get('id', ''),
        }

def upload_original_video_to_s3(video_path: str, video_id: str, s3_client) -> str:
    """Upload original video to S3 with chunkwise prefix"""
    s3_key = generate_chunkwise_s3_key(f"videos/{video_id}/original.mp4")
    
    s3_client.upload_file(
        video_path,
        S3_BUCKET_NAME,
        s3_key
    )
    
    return s3_key

@app.cls(
    gpu="T4",
    timeout=1800,  # 30 minutes
    retries=1,
    secrets=[
        modal.Secret.from_name("ai-podcast-clipper-secret"),
    ],
    volumes={mount_path: volume}
)
class ChunkwiseProcessor:
    @modal.enter()
    def load_models(self):
        """Load transcription models and initialize clients."""
        print("🚀 Initializing OpenAI client...")
        self.openai_client = openai.OpenAI()
        print("✅ OpenAI client initialized.")

    def _transcribe_audio(self, audio_path: str) -> list:
        """Transcribes audio using OpenAI Whisper API and returns word-level segments."""
        print(f"Transcribing audio file: {audio_path}")
        with open(audio_path, "rb") as audio_file:
            transcript = self.openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
                timestamp_granularities=["word"]
            )
        
        all_segments = []
        if transcript.words:
            for word_segment in transcript.words:
                all_segments.append({
                    "start": word_segment.start,
                    "end": word_segment.end,
                    "word": word_segment.word,
                })
        print(f"✅ Transcription complete. Found {len(all_segments)} word segments.")
        return all_segments

    def process_youtube_video(self, request_data: dict) -> dict:
        """Main processing method for YouTube videos"""
        youtube_url = request_data["youtube_url"]
        video_id = request_data["video_id"]
        chunks = request_data.get("chunks", [])

        if not chunks:
            return {'success': False, 'error': 'Chunks are required for YouTube processing.'}

        print(f"Processing YouTube video: {youtube_url}")
        print(f"Video ID: {video_id}")
        print(f"Received {len(chunks)} chunks.")

        run_id = str(uuid.uuid4())
        base_dir = pathlib.Path("/tmp") / run_id
        base_dir.mkdir(parents=True, exist_ok=True)

        try:
            print("Downloading YouTube video...")
            video_path = base_dir / "original.mp4"
            video_info = download_youtube_video(youtube_url, str(video_path))

            print("Uploading original video to S3...")
            s3_client = boto3.client("s3")
            original_s3_key = upload_original_video_to_s3(str(video_path), video_id, s3_client)

            print("Transcribing the entire video once...")
            audio_path = str(base_dir / "full_audio.wav")
            extract_cmd = f"ffmpeg -i {video_path} -vn -acodec pcm_s16le -ar 16000 -ac 1 {audio_path}"
            subprocess.run(extract_cmd, shell=True, check=True, capture_output=True)
            
            all_segments = []
            try:
                all_segments = self._transcribe_audio(audio_path)
            finally:
                if os.path.exists(audio_path):
                    os.remove(audio_path)
            
            processed_chunks = []
            for idx, chunk in enumerate(chunks, 1):
                processed_chunks.append({
                    'chunk_number': idx,
                    'start_time_seconds': int(chunk['start']),
                    'end_time_seconds': int(chunk['end']),
                    'duration_seconds': int(chunk['end'] - chunk['start']),
                })

            return {
                'success': True,
                'video_info': video_info,
                'original_s3_key': original_s3_key,
                'chunks': processed_chunks,
                'transcript': all_segments,
                'total_chunks': len(processed_chunks),
            }
        except Exception as e:
            print(f"Error processing video: {str(e)}")
            return {'success': False, 'error': str(e)}
        finally:
            if base_dir.exists():
                print(f"Cleaning up temp dir: {base_dir}")
                shutil.rmtree(base_dir, ignore_errors=True)

    def process_s3_video(self, request_data: dict) -> dict:
        """Process existing S3 video with new chunk configuration (for re-chunking)"""
        video_id = request_data["video_id"]
        s3_key = request_data["s3_key"]
        chunks = request_data.get("chunks", [])
        existing_transcript = request_data.get("existing_transcript", [])
        
        if not chunks:
            return {'success': False, 'error': 'Chunks are required for S3 processing.'}

        print(f"Processing S3 video: {s3_key}")
        print(f"Video ID: {video_id}")
        print(f"Received {len(chunks)} chunks.")
        print(f"Using existing transcript: {len(existing_transcript) > 0}")

        run_id = str(uuid.uuid4())
        base_dir = pathlib.Path("/tmp") / run_id
        base_dir.mkdir(parents=True, exist_ok=True)

        try:
            total_duration = None
            all_segments = existing_transcript
            
            if not all_segments:
                print("No existing transcript. Downloading video to transcribe and get duration...")
                video_path = base_dir / "original.mp4"
                s3_client = boto3.client("s3")
                s3_client.download_file(S3_BUCKET_NAME, s3_key, str(video_path))
                
                probe_cmd = f"ffprobe -v quiet -show_entries format=duration -of csv=p=0 {video_path}"
                result = subprocess.run(probe_cmd, shell=True, capture_output=True, text=True)
                total_duration = float(result.stdout.strip())
                print(f"Extracted duration from video: {total_duration} seconds")

                print("Extracting audio for transcription...")
                audio_path = str(base_dir / "full_audio.wav")
                extract_cmd = f"ffmpeg -i {video_path} -vn -acodec pcm_s16le -ar 16000 -ac 1 {audio_path}"
                subprocess.run(extract_cmd, shell=True, check=True, capture_output=True)
                
                try:
                    all_segments = self._transcribe_audio(audio_path)
                finally:
                    if os.path.exists(audio_path):
                        os.remove(audio_path)
            else:
                try:
                    last_segment = max(existing_transcript, key=lambda x: x.get('end', 0))
                    total_duration = last_segment.get('end', 0)
                    print(f"Estimated duration from transcript: {total_duration} seconds")
                except (KeyError, ValueError, TypeError):
                    # Fallback to getting duration from ffprobe if transcript is malformed
                    print("Could not estimate duration from transcript, will need to download video.")
                    video_path = base_dir / "original.mp4"
                    s3_client = boto3.client("s3")
                    s3_client.download_file(S3_BUCKET_NAME, s3_key, str(video_path))
                    probe_cmd = f"ffprobe -v quiet -show_entries format=duration -of csv=p=0 {video_path}"
                    result = subprocess.run(probe_cmd, shell=True, capture_output=True, text=True)
                    total_duration = float(result.stdout.strip())
                    print(f"Extracted duration from video: {total_duration} seconds")
            
            video_info = {
                'duration': total_duration,
                'title': f'Processed Video {video_id}',
                'thumbnail': '',
                'youtube_id': '',
            }

            processed_chunks = []
            for idx, chunk in enumerate(chunks, 1):
                processed_chunks.append({
                    'chunk_number': idx,
                    'start_time_seconds': int(chunk['start']),
                    'end_time_seconds': int(chunk['end']),
                    'duration_seconds': int(chunk['end'] - chunk['start']),
                })

            return {
                'success': True,
                'video_info': video_info,
                'original_s3_key': s3_key,
                'chunks': processed_chunks,
                'transcript': all_segments,
                'total_chunks': len(processed_chunks),
                're_chunked': bool(existing_transcript),
            }
        except Exception as e:
            print(f"Error processing S3 video: {str(e)}")
            return {'success': False, 'error': str(e)}
        finally:
            if base_dir.exists():
                print(f"Cleaning up temp dir: {base_dir}")
                shutil.rmtree(base_dir, ignore_errors=True)

    @modal.fastapi_endpoint(method="POST")
    async def process_video_endpoint(
        self,
        request: Request,
        token: HTTPAuthorizationCredentials = Depends(auth_scheme)
    ):
        """FastAPI endpoint for processing both YouTube and file-upload jobs"""
        if token.credentials != os.environ["AUTH_TOKEN"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect bearer token",
                headers={"WWW-Authenticate": "Bearer"}
            )
        data = await request.json()
        print(f"✅ Received request data: {json.dumps(data)}")
        
        if "youtube_url" in data:
            return self.process_youtube_video(data)
        elif "s3_key" in data:
            return self.process_s3_video(data)
        else:
            raise HTTPException(status_code=422, detail="Invalid payload: must include either youtube_url or s3_key")

    @modal.fastapi_endpoint(method="POST")
    async def generate_thumbnail(
        self,
        request: Request,
        token: HTTPAuthorizationCredentials = Depends(auth_scheme)
    ):
        """Generate a thumbnail from a video at a specific time offset"""
        if token.credentials != os.environ["AUTH_TOKEN"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect bearer token",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        data = await request.json()
        
        try:
            video_url = data.get("video_url")
            time_offset = data.get("time_offset", 5)
            width = data.get("width", 480)
            height = data.get("height", 270)
            output_format = data.get("output_format", "jpeg")
            
            if not video_url:
                raise HTTPException(status_code=400, detail="video_url is required")
            
            # Create temporary directory
            base_dir = pathlib.Path("/tmp") / f"thumbnail_{uuid.uuid4()}"
            base_dir.mkdir(parents=True, exist_ok=True)
            
            try:
                # Download video to temp location if it's a URL
                if video_url.startswith("http"):
                    video_path = base_dir / "video_temp.mp4"
                    print(f"Downloading video from: {video_url}")
                    
                    # Use requests to download video
                    response = requests.get(video_url, stream=True)
                    response.raise_for_status()
                    
                    with open(video_path, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            f.write(chunk)
                    
                    print(f"Video downloaded successfully to: {video_path}")
                else:
                    video_path = pathlib.Path(video_url)
                
                # First, get video duration to ensure time_offset is valid
                duration_cmd = [
                    "ffprobe", "-v", "quiet", "-show_entries", "format=duration",
                    "-of", "csv=p=0", str(video_path)
                ]
                
                duration_result = subprocess.run(duration_cmd, capture_output=True, text=True)
                if duration_result.returncode == 0:
                    try:
                        video_duration = float(duration_result.stdout.strip())
                        print(f"Video duration: {video_duration} seconds")
                        
                        # Adjust time_offset if it exceeds video duration
                        if time_offset >= video_duration:
                            # Use 10% of video duration or 1 second, whichever is smaller
                            time_offset = min(video_duration * 0.1, 1.0)
                            print(f"Adjusted time_offset to {time_offset} seconds (video too short)")
                        
                        # Ensure minimum offset of 0
                        time_offset = max(0, time_offset)
                        
                    except (ValueError, TypeError):
                        print("Could not parse video duration, using default offset")
                        time_offset = 1.0  # Fallback to 1 second
                else:
                    print("Could not determine video duration, using safe fallback")
                    time_offset = 1.0  # Fallback to 1 second
                
                # Generate thumbnail using ffmpeg
                thumbnail_path = base_dir / f"thumbnail.{output_format}"
                ffmpeg_cmd = [
                    "ffmpeg", "-i", str(video_path),
                    "-ss", str(time_offset),
                    "-vframes", "1",
                    "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
                    "-q:v", "2",  # High quality
                    "-y",  # Overwrite output
                    str(thumbnail_path)
                ]
                
                print(f"Running ffmpeg command with time_offset={time_offset}")
                result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
                
                if result.returncode != 0:
                    print(f"FFmpeg error: {result.stderr}")
                    # Try with time_offset=0 as final fallback
                    print("Retrying with time_offset=0")
                    ffmpeg_cmd[4] = "0"  # Set -ss to 0
                    result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
                    
                    if result.returncode != 0:
                        print(f"FFmpeg retry failed: {result.stderr}")
                        raise HTTPException(status_code=500, detail=f"Thumbnail generation failed: {result.stderr}")
                
                # Verify thumbnail file was created
                if not thumbnail_path.exists():
                    raise HTTPException(status_code=500, detail="Thumbnail file was not generated")
                
                # Read thumbnail file and return as bytes
                with open(thumbnail_path, "rb") as f:
                    thumbnail_data = f.read()
                
                print(f"Thumbnail generated successfully: {len(thumbnail_data)} bytes")
                
                return Response(
                    content=thumbnail_data,
                    media_type=f"image/{output_format}",
                    headers={
                        "Content-Disposition": f"inline; filename=thumbnail.{output_format}",
                        "Cache-Control": "public, max-age=3600"
                    }
                )
                
            finally:
                # Cleanup temp directory
                if base_dir.exists():
                    shutil.rmtree(base_dir, ignore_errors=True)
                
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error generating thumbnail: {e}")
            raise HTTPException(status_code=500, detail=f"Thumbnail generation failed: {str(e)}")

@app.local_entrypoint()
def main():
    """Local testing entrypoint"""
    processor = ChunkwiseProcessor()
    
    # Test with a short YouTube video
    test_result = processor.process_youtube_video({
        "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",  # Rick Roll for testing
        "video_id": "test-video-id",
        "chunk_duration_minutes": 1,  # 1 minute chunks for testing
    })
    
    print("Test result:", json.dumps(test_result, indent=2))

# Ensure Modal exposes endpoints for deployment 