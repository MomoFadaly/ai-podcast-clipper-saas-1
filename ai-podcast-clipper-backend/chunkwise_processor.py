import json
import pathlib
import shutil
import subprocess
import time
import uuid
import boto3
import modal
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
import whisperx
import yt_dlp

# Modal image setup with required dependencies
image = (modal.Image.from_registry(
    "nvidia/cuda:12.4.0-devel-ubuntu22.04", add_python="3.12")
    .apt_install(["ffmpeg", "libgl1-mesa-glx", "wget"])
    .pip_install_from_requirements("requirements.txt")
)

# Modal app setup
app = modal.App("chunkwise-processor", image=image)

# Constants
CHUNKWISE_S3_PREFIX = "chunkwise/"
S3_BUCKET_NAME = "ai-podcast-clipper"  # Reusing existing bucket

# Authentication
auth_scheme = HTTPBearer()

class ProcessYouTubeVideoRequest(BaseModel):
    youtube_url: str
    video_id: str  # UUID from database
    chunk_config: dict = {"method": "minutes", "minutesPerChunk": 10, "totalChunks": 1}  # Default config

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

def create_video_chunks(video_path: str, chunk_config: dict, output_dir: str) -> list:
    """Split video into chunks based on chunk_config (minutes or total chunks) using ffmpeg"""
    # Get video duration first
    probe_cmd = f"ffprobe -v quiet -show_entries format=duration -of csv=p=0 {video_path}"
    result = subprocess.run(probe_cmd, shell=True, capture_output=True, text=True)
    total_duration = float(result.stdout.strip())

    method = chunk_config.get("method", "minutes")
    minutes_per_chunk = float(chunk_config.get("minutesPerChunk", 10))
    total_chunks = int(chunk_config.get("totalChunks", 1))

    # Calculate chunk boundaries
    chunk_boundaries = []
    if method == "chunks":
        # Split into N chunks
        chunk_duration = total_duration / total_chunks
        for i in range(total_chunks):
            start_time = i * chunk_duration
            end_time = min((i + 1) * chunk_duration, total_duration)
            if end_time - start_time >= 30:  # Minimum 30s
                chunk_boundaries.append((start_time, end_time))
    else:
        # Split by minutes per chunk
        chunk_duration = minutes_per_chunk * 60
        start_time = 0
        while start_time < total_duration:
            end_time = min(start_time + chunk_duration, total_duration)
            if end_time - start_time >= 30:  # Minimum 30s
                chunk_boundaries.append((start_time, end_time))
            start_time = end_time

    # Actually create the chunks
    chunks_created = []
    for idx, (start_time, end_time) in enumerate(chunk_boundaries, 1):
        chunk_filename = f"chunk-{idx}.mp4"
        chunk_path = os.path.join(output_dir, chunk_filename)
        duration = end_time - start_time
        ffmpeg_cmd = (
            f"ffmpeg -i {video_path} "
            f"-ss {start_time} -t {duration} "
            f"-c copy -avoid_negative_ts make_zero "
            f"{chunk_path}"
        )
        subprocess.run(ffmpeg_cmd, shell=True, check=True, capture_output=True)
        chunks_created.append({
            'chunk_number': idx,
            'filename': chunk_filename,
            'path': chunk_path,
            'start_time': start_time,
            'end_time': end_time,
            'duration': duration
        })
    return chunks_created

def transcribe_video_chunk(video_path: str, whisperx_model, alignment_model, metadata) -> list:
    """Transcribe a video chunk using WhisperX"""
    # Extract audio from video
    audio_path = video_path.replace('.mp4', '_audio.wav')
    extract_cmd = f"ffmpeg -i {video_path} -vn -acodec pcm_s16le -ar 16000 -ac 1 {audio_path}"
    subprocess.run(extract_cmd, shell=True, check=True, capture_output=True)
    
    try:
        # Transcribe using WhisperX
        audio = whisperx.load_audio(audio_path)
        result = whisperx_model.transcribe(audio, batch_size=16)
        
        # Align transcript
        result = whisperx.align(
            result["segments"],
            alignment_model,
            metadata,
            audio,
            device="cuda",
            return_char_alignments=False
        )
        
        # Convert to word-level segments
        segments = []
        if "word_segments" in result:
            for word_segment in result["word_segments"]:
                segments.append({
                    "start": word_segment["start"],
                    "end": word_segment["end"],
                    "word": word_segment["word"],
                })
        
        return segments
    
    finally:
        # Clean up audio file
        if os.path.exists(audio_path):
            os.remove(audio_path)

def upload_chunk_to_s3(chunk_info: dict, video_id: str, s3_client) -> str:
    """Upload video chunk to S3 with chunkwise prefix"""
    s3_key = generate_chunkwise_s3_key(f"videos/{video_id}/chunks/{chunk_info['filename']}")
    
    s3_client.upload_file(
        chunk_info['path'],
        S3_BUCKET_NAME,
        s3_key
    )
    
    return s3_key

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
    gpu="T4",  # Lighter GPU since we're not doing AI processing
    timeout=1800,  # 30 minutes
    retries=1,
    secrets=[modal.Secret.from_name("ai-podcast-clipper-secret")]
)
class ChunkwiseProcessor:
    @modal.enter()
    def load_models(self):
        """Load WhisperX models for transcription"""
        print("Loading WhisperX models...")
        
        self.whisperx_model = whisperx.load_model(
            "large-v2", 
            device="cuda", 
            compute_type="float16"
        )
        
        self.alignment_model, self.metadata = whisperx.load_align_model(
            language_code="en",
            device="cuda"
        )
        
        print("Models loaded successfully")

    @modal.method()
    def process_youtube_video(self, request_data: dict) -> dict:
        """Main processing method for YouTube videos"""
        youtube_url = request_data["youtube_url"]
        video_id = request_data["video_id"]
        # Accept chunk_config dict, fallback to old param for backward compatibility
        chunk_config = request_data.get("chunk_config")
        if not chunk_config:
            # Fallback for old clients
            chunk_duration_minutes = request_data.get("chunk_duration_minutes", 10)
            chunk_config = {"method": "minutes", "minutesPerChunk": chunk_duration_minutes, "totalChunks": 1}

        print(f"Processing YouTube video: {youtube_url}")
        print(f"Video ID: {video_id}")
        print(f"Chunk config: {chunk_config}")

        # Create temporary directory
        run_id = str(uuid.uuid4())
        base_dir = pathlib.Path("/tmp") / run_id
        base_dir.mkdir(parents=True, exist_ok=True)

        try:
            # 1. Download YouTube video
            print("Downloading YouTube video...")
            video_path = base_dir / "original.mp4"
            video_info = download_youtube_video(youtube_url, str(video_path))

            # 2. Upload original video to S3
            print("Uploading original video to S3...")
            s3_client = boto3.client("s3")
            original_s3_key = upload_original_video_to_s3(str(video_path), video_id, s3_client)

            # 3. Create chunks
            print(f"Creating chunks with config: {chunk_config}")
            chunks_dir = base_dir / "chunks"
            chunks_dir.mkdir(exist_ok=True)

            chunks = create_video_chunks(
                str(video_path),
                chunk_config,
                str(chunks_dir)
            )

            # 4. Process each chunk
            processed_chunks = []
            for chunk in chunks:
                print(f"Processing chunk {chunk['chunk_number']}...")
                transcript = transcribe_video_chunk(
                    chunk['path'],
                    self.whisperx_model,
                    self.alignment_model,
                    self.metadata
                )
                chunk_s3_key = upload_chunk_to_s3(chunk, video_id, s3_client)
                processed_chunks.append({
                    'chunk_number': chunk['chunk_number'],
                    'start_time_seconds': int(chunk['start_time']),
                    'end_time_seconds': int(chunk['end_time']),
                    'duration_seconds': int(chunk['duration']),
                    's3_key': chunk_s3_key,
                    'transcript': transcript,
                })

            return {
                'success': True,
                'video_info': video_info,
                'original_s3_key': original_s3_key,
                'chunks': processed_chunks,
                'total_chunks': len(processed_chunks),
            }
        except Exception as e:
            print(f"Error processing video: {str(e)}")
            return {
                'success': False,
                'error': str(e),
            }
        finally:
            if base_dir.exists():
                print(f"Cleaning up temp dir: {base_dir}")
                shutil.rmtree(base_dir, ignore_errors=True)

    @modal.fastapi_endpoint(method="POST")
    def process_video_endpoint(
        self,
        request: ProcessYouTubeVideoRequest,
        token: HTTPAuthorizationCredentials = Depends(auth_scheme)
    ):
        """FastAPI endpoint for processing YouTube videos"""
        if token.credentials != os.environ["AUTH_TOKEN"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect bearer token",
                headers={"WWW-Authenticate": "Bearer"}
            )
        # Accept chunk_config from request, fallback for old clients
        chunk_config = getattr(request, "chunk_config", None)
        if not chunk_config:
            chunk_config = {"method": "minutes", "minutesPerChunk": getattr(request, "chunk_duration_minutes", 10), "totalChunks": 1}
        result = self.process_youtube_video({
            "youtube_url": request.youtube_url,
            "video_id": request.video_id,
            "chunk_config": chunk_config,
        })
        return result

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