import json
import pathlib
import shutil
import subprocess
import time
import uuid
import boto3
from fastapi import Depends, HTTPException, status, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import modal
from pydantic import BaseModel
import os
import whisperx
import yt_dlp
import requests
import re
from youtubesearchpython import Video
from fastapi.responses import Response
import psycopg2


class ProcessVideoRequest(BaseModel):
    s3_key: str
    chunks: list  # Required: list of {start, end} dicts


class ProcessYouTubeRequest(BaseModel):
    youtube_url: str
    chunk_config: dict = {"method": "minutes", "minutesPerChunk": 5, "totalChunks": 1}


# Simplified image for video processing only
image = (modal.Image.from_registry(
    "nvidia/cuda:12.4.0-devel-ubuntu22.04", add_python="3.12")
    .apt_install([
        "ffmpeg", 
        "libgl1-mesa-glx", 
        "libcudnn8",  # Add cuDNN library
        "libcudnn8-dev"  # Add cuDNN development library
    ])
    .pip_install_from_requirements("requirements.txt"))

app = modal.App("ai-podcast-clipper", image=image)

volume = modal.Volume.from_name(
    "ai-podcast-clipper-model-cache", create_if_missing=True
)

mount_path = "/root/.cache/torch"

auth_scheme = HTTPBearer()


def generate_presigned_url(s3_key: str, expires_in: int = 3600) -> str:
    """Generate a pre-signed S3 URL for a given key."""
    s3_client = boto3.client("s3")
    return s3_client.generate_presigned_url(
        'get_object',
        Params={'Bucket': 'ai-podcast-clipper', 'Key': s3_key},
        ExpiresIn=expires_in
    )


def update_clip_thumbnail_url_in_postgres(clip_s3_key: str, thumbnail_s3_key: str):
    """Update the thumbnailUrl for a Clip in Supabase/Postgres using direct SQL and POSTGRES_URL env var."""
    postgres_url = os.environ.get("POSTGRES_URL")
    if not postgres_url:
        print("❌ POSTGRES_URL environment variable not set.")
        return False
    presigned_url = generate_presigned_url(thumbnail_s3_key)
    print(f"Generated presigned URL for thumbnail: {presigned_url}")
    # Debug print (redact password)
    safe_url = postgres_url
    if '://' in safe_url:
        parts = safe_url.split('://', 1)
        if '@' in parts[1]:
            creds, rest = parts[1].split('@', 1)
            if ':' in creds:
                user, _ = creds.split(':', 1)
                safe_url = f"{parts[0]}://{user}:***@{rest}"
    print(f"Connecting to Postgres with: {safe_url}")
    try:
        conn = psycopg2.connect(postgres_url)
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE public."Clip"
            SET "thumbnailUrl" = %s
            WHERE "s3Key" = %s
            """,
            (presigned_url, clip_s3_key)
        )
        rows_updated = cur.rowcount
        conn.commit()
        cur.close()
        conn.close()
        if rows_updated == 0:
            print(f"⚠️ No rows updated for clip_s3_key: {clip_s3_key}. Check if this matches the s3Key in the Clip table and that the row exists before processing.")
        else:
            print(f"✅ Updated thumbnailUrl for clip {clip_s3_key} in Postgres. Rows updated: {rows_updated}")
        return rows_updated > 0
    except Exception as e:
        print(f"❌ Exception updating thumbnailUrl for clip {clip_s3_key} in Postgres: {e}")
        return False


def update_project_thumbnail_url_in_postgres(project_s3_key: str, thumbnail_s3_key: str):
    """Update the thumbnailUrl for a Project/UploadedFile in Supabase/Postgres using direct SQL and POSTGRES_URL env var."""
    postgres_url = os.environ.get("POSTGRES_URL")
    if not postgres_url:
        print("❌ POSTGRES_URL environment variable not set.")
        return False
    # Generate pre-signed URL for the thumbnail
    presigned_url = generate_presigned_url(thumbnail_s3_key)
    print(f"Generated presigned URL for main thumbnail: {presigned_url}")
    # Debug print (redact password)
    safe_url = postgres_url
    if '://' in safe_url:
        parts = safe_url.split('://', 1)
        if '@' in parts[1]:
            creds, rest = parts[1].split('@', 1)
            if ':' in creds:
                user, _ = creds.split(':', 1)
                safe_url = f"{parts[0]}://{user}:***@{rest}"
    print(f"Connecting to Postgres with: {safe_url}")
    try:
        conn = psycopg2.connect(postgres_url)
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE public."UploadedFile"
            SET "thumbnailUrl" = %s
            WHERE "s3Key" = %s
            """,
            (presigned_url, project_s3_key)
        )
        conn.commit()
        cur.close()
        conn.close()
        print(f"✅ Updated thumbnailUrl for project {project_s3_key} in Postgres.")
        return True
    except Exception as e:
        print(f"❌ Exception updating thumbnailUrl for project {project_s3_key} in Postgres: {e}")
        return False


def upsert_clip_thumbnail_in_postgres(clip_s3_key: str, thumbnail_s3_key: str):
    """Upsert the thumbnailUrl for a Clip in Supabase/Postgres using direct SQL and POSTGRES_URL env var."""
    postgres_url = os.environ.get("POSTGRES_URL")
    if not postgres_url:
        print("❌ POSTGRES_URL environment variable not set.")
        return False
    presigned_url = generate_presigned_url(thumbnail_s3_key)
    print(f"Generated presigned URL for thumbnail: {presigned_url}")
    # Debug print (redact password)
    safe_url = postgres_url
    if '://' in safe_url:
        parts = safe_url.split('://', 1)
        if '@' in parts[1]:
            creds, rest = parts[1].split('@', 1)
            if ':' in creds:
                user, _ = creds.split(':', 1)
                safe_url = f"{parts[0]}://{user}:***@{rest}"
    print(f"Connecting to Postgres with: {safe_url}")
    try:
        conn = psycopg2.connect(postgres_url)
        cur = conn.cursor()
        # Try update first
        cur.execute(
            """
            UPDATE public."Clip"
            SET "thumbnailUrl" = %s
            WHERE "s3Key" = %s
            """,
            (presigned_url, clip_s3_key)
        )
        rows_updated = cur.rowcount
        if rows_updated == 0:
            print(f"No existing Clip row for s3Key: {clip_s3_key}, inserting new row.")
            # Insert a new row with minimal required fields (id, s3Key, thumbnailUrl, createdAt, updatedAt)
            import datetime, uuid
            now = datetime.datetime.utcnow()
            new_id = str(uuid.uuid4())
            cur.execute(
                """
                INSERT INTO public."Clip" ("id", "s3Key", "thumbnailUrl", "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT ("s3Key") DO UPDATE SET "thumbnailUrl" = EXCLUDED."thumbnailUrl"
                """,
                (new_id, clip_s3_key, presigned_url, now, now)
            )
            print(f"✅ Inserted new Clip row for s3Key: {clip_s3_key} with thumbnailUrl.")
        else:
            print(f"✅ Updated thumbnailUrl for clip {clip_s3_key} in Postgres. Rows updated: {rows_updated}")
        conn.commit()
        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Exception upserting thumbnailUrl for clip {clip_s3_key} in Postgres: {e}")
        return False


def process_simple_clip(base_dir: str, original_video_path: str, s3_key: str, 
                       start_time: float, end_time: float, clip_index: int):
    """Process a video clip - just cutting without subtitles, and generate a thumbnail"""
    clip_name = f"clip_{clip_index}"
    s3_key_dir = os.path.dirname(s3_key)
    output_s3_key = f"{s3_key_dir}/{clip_name}.mp4"
    print(f"Output S3 key: {output_s3_key}")

    clip_dir = base_dir / clip_name
    clip_dir.mkdir(parents=True, exist_ok=True)

    clip_output_path = clip_dir / f"{clip_name}.mp4"

    # Cut the video segment
    duration = end_time - start_time
    cut_command = (f"ffmpeg -i {original_video_path} -ss {start_time} -t {duration} "
                   f"-c copy {clip_output_path}")
    subprocess.run(cut_command, shell=True, check=True, capture_output=True, text=True)

    # Generate thumbnail (first frame)
    thumbnail_path = clip_dir / f"{clip_name}.jpg"
    thumb_command = (f"ffmpeg -i {clip_output_path} -ss 0 -vframes 1 -q:v 2 {thumbnail_path}")
    subprocess.run(thumb_command, shell=True, check=True, capture_output=True, text=True)

    # Upload to S3
    s3_client = boto3.client("s3")
    s3_client.upload_file(str(clip_output_path), "ai-podcast-clipper", output_s3_key)
    print(f"Uploaded clip {clip_index} to S3: {output_s3_key}")

    # Upload thumbnail to S3
    thumbnail_s3_key = f"{s3_key_dir}/{clip_name}.jpg"
    s3_client.upload_file(str(thumbnail_path), "ai-podcast-clipper", thumbnail_s3_key)
    print(f"Uploaded thumbnail for clip {clip_index} to S3: {thumbnail_s3_key}")

    # Update Postgres with the presigned URL for this clip thumbnail
    update_clip_thumbnail_url_in_postgres(output_s3_key, thumbnail_s3_key)

    return {
        "clip_s3_key": output_s3_key,
        "thumbnail_s3_key": thumbnail_s3_key
    }


def extract_video_id(url: str) -> str:
    """Extract YouTube video ID from URL"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'youtube\.com\/watch\?.*v=([^&\n?#]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return ""


def get_youtube_metadata_api(video_id: str) -> dict:
    """Get YouTube metadata using YouTube Data API as fallback"""
    try:
        # This would require a YouTube Data API key
        # For now, return basic metadata structure
        return {
            'id': video_id,
            'title': f'YouTube Video {video_id}',
            'description': 'Video description not available',
            'duration': 300,  # 5 minutes default
            'channel': 'YouTube Channel',
            'thumbnail': f'https://img.youtube.com/vi/{video_id}/maxresdefault.jpg',
            'upload_date': '20240101',
            'view_count': 0,
        }
    except Exception as e:
        print(f"YouTube API fallback failed: {e}")
        return None


def download_youtube_video(youtube_url: str, output_path: str) -> dict:
    """Download YouTube video using yt-dlp and return metadata"""
    try:
        ydl_opts = {
            'format': 'best[ext=mp4][height<=720]/best[ext=mp4]/best',
            'outtmpl': output_path,
            'quiet': True,
            'no_warnings': True,
            # Advanced anti-detection measures
            'user_agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0',
            },
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'web'],
                    'player_skip': ['configs', 'webpage'],
                    'skip': ['hls', 'dash'],
                }
            },
            'sleep_interval_requests': 1,
            'sleep_interval': 1,
            'max_sleep_interval': 5,
            'socket_timeout': 30,
            'retries': 3,
            'fragment_retries': 3,
            'ignoreerrors': False,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract info and download
            info = ydl.extract_info(youtube_url, download=True)
            
            metadata = {
                'id': info.get('id', ''),
                'title': info.get('title', 'Unknown Title'),
                'description': info.get('description', ''),
                'duration': info.get('duration', 0),
                'channel': info.get('uploader', 'Unknown Channel'),
                'thumbnail': info.get('thumbnail', ''),
                'upload_date': info.get('upload_date', ''),
                'view_count': info.get('view_count', 0),
            }
            
            return metadata
            
    except Exception as e:
        print(f"Error downloading YouTube video: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to download video: {str(e)}")


# --- Unified chunking logic ---
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


def create_video_chunks_from_boundaries(video_path: str, chunk_boundaries: list, output_dir: str) -> list:
    """Create video chunks from explicit start/end boundaries using ffmpeg, ensuring last chunk is at least 10 seconds."""
    # Defensive copy
    chunk_boundaries = [dict(b) for b in chunk_boundaries]
    n = len(chunk_boundaries)
    if n > 1:
        last_duration = chunk_boundaries[-1]["end"] - chunk_boundaries[-1]["start"]
        if last_duration < 10:
            # Calculate how much to borrow
            needed = 10 - last_duration
            prev_duration = chunk_boundaries[-2]["end"] - chunk_boundaries[-2]["start"]
            # Only borrow if previous chunk will remain >= 1s
            if prev_duration - needed >= 1:
                chunk_boundaries[-2]["end"] -= needed
                chunk_boundaries[-1]["start"] -= needed
            else:
                # Borrow as much as possible, but keep previous chunk at 1s
                can_borrow = prev_duration - 1
                if can_borrow > 0:
                    chunk_boundaries[-2]["end"] -= can_borrow
                    chunk_boundaries[-1]["start"] -= can_borrow
    # Now create the chunks
    chunks_created = []
    for idx, boundary in enumerate(chunk_boundaries, 1):
        start_time = boundary["start"]
        end_time = boundary["end"]
        duration = end_time - start_time
        chunk_filename = f"chunk-{idx}.mp4"
        chunk_path = os.path.join(output_dir, chunk_filename)
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


# Lightweight metadata extraction function using youtube-search-python
@app.function(timeout=30)
def get_youtube_metadata_lightweight(url: str):
    """Get YouTube video metadata using youtube-search-python library"""
    
    try:
        print(f"Extracting metadata using youtube-search-python for: {url}")
        
        # Extract video ID for validation
        def extract_video_id(url: str) -> str:
            patterns = [
                r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
                r'youtube\.com\/watch\?.*v=([^&\n?#]+)',
            ]
            
            for pattern in patterns:
                match = re.search(pattern, url)
                if match:
                    return match.group(1)
            return ""
        
        video_id = extract_video_id(url)
        if not video_id:
            return {
                "success": False,
                "message": "Could not extract video ID from URL",
                "data": None
            }
        
        print(f"Extracted video ID: {video_id}")
        
        # Use youtube-search-python to get video info (much more reliable than web scraping)
        video_info = Video.getInfo(url)
        
        if not video_info or 'title' not in video_info:
            return {
                "success": False,
                "message": "Could not fetch video information",
                "data": None
            }
        
        # Extract duration in seconds
        duration_seconds = 300  # Default fallback
        
        # Try to get duration from the video info
        if 'duration' in video_info and video_info['duration']:
            duration_str = video_info['duration']
            print(f"Duration string from API: {duration_str}")
            
            # Parse duration (format: "2:56" or "1:23:45")
            try:
                time_parts = duration_str.split(':')
                if len(time_parts) == 2:  # MM:SS
                    duration_seconds = int(time_parts[0]) * 60 + int(time_parts[1])
                elif len(time_parts) == 3:  # HH:MM:SS
                    duration_seconds = int(time_parts[0]) * 3600 + int(time_parts[1]) * 60 + int(time_parts[2])
                print(f"Parsed duration: {duration_seconds} seconds")
            except (ValueError, IndexError) as e:
                print(f"Error parsing duration: {e}")
        
        # Format the response
        metadata = {
            "id": video_id,
            "title": video_info.get('title', 'Unknown Title'),
            "duration": duration_seconds,
            "channel": video_info.get('channel', {}).get('name', 'Unknown Channel'),
            "channel_id": video_info.get('channel', {}).get('id', ''),
            "view_count": video_info.get('viewCount', {}).get('text', '0 views'),
            "description": video_info.get('description', '')[:500] + "..." if video_info.get('description', '') else '',
            "thumbnails": video_info.get('thumbnails', []),
            "upload_date": video_info.get('uploadDate', ''),
            "url": url,
            "method": "youtube-search-python"
        }
        
        print(f"Successfully extracted metadata: {metadata['title']} - {duration_seconds}s")
        
        return {
            "success": True,
            "message": "Metadata extracted successfully using youtube-search-python",
            "data": metadata
        }
        
    except Exception as e:
        print(f"Error in youtube-search-python extraction: {str(e)}")
        
        # Fallback to basic info if the library fails
        try:
            # Minimal fallback using OEmbed
            import requests
            oembed_url = f"https://www.youtube.com/oembed?url={url}&format=json"
            response = requests.get(oembed_url, timeout=10)
            
            if response.status_code == 200:
                oembed_data = response.json()
                return {
                    "success": True,
                    "message": f"Fallback extraction successful (youtube-search-python failed: {str(e)})",
                    "data": {
                        "id": extract_video_id(url),
                        "title": oembed_data.get('title', 'Unknown Title'),
                        "duration": 300,  # Default fallback
                        "channel": oembed_data.get('author_name', 'Unknown Channel'),
                        "channel_id": "",
                        "view_count": "Unknown views",
                        "description": "",
                        "thumbnails": [{"url": oembed_data.get('thumbnail_url', ''), "width": oembed_data.get('thumbnail_width', 0), "height": oembed_data.get('thumbnail_height', 0)}],
                        "upload_date": "",
                        "url": url,
                        "method": "fallback-oembed"
                    }
                }
        except Exception as fallback_error:
            print(f"Fallback also failed: {str(fallback_error)}")
        
        return {
            "success": False,
            "message": f"All extraction methods failed: {str(e)}",
            "data": None
        }


# Expose the lightweight function as an HTTP endpoint
@app.function(timeout=60)
@modal.asgi_app()
def get_youtube_metadata_endpoint():
    from fastapi import FastAPI, HTTPException, Query
    
    fastapi_app = FastAPI()
    
    @fastapi_app.get("/")
    def get_metadata(url: str = Query(..., description="YouTube URL to extract metadata from")):
        try:
            result = get_youtube_metadata_lightweight.local(url)
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error extracting metadata: {str(e)}")
    
    return fastapi_app


@app.cls(gpu="T4", timeout=900, retries=0, scaledown_window=20, 
         secrets=[modal.Secret.from_name("ai-podcast-clipper-secret")], 
         volumes={mount_path: volume})
class AiPodcastClipper:
    @modal.enter()
    def load_model(self):
        print("Loading models")
        
        # Try GPU first, fallback to CPU if CUDA libraries are missing
        try:
            print("Attempting to load WhisperX model on GPU...")
            self.whisperx_model = whisperx.load_model(
                "large-v2", device="cuda", compute_type="float16")
            print("✅ WhisperX model loaded on GPU successfully")
            
            self.alignment_model, self.metadata = whisperx.load_align_model(
                language_code="en", device="cuda")
            print("✅ Alignment model loaded on GPU successfully")
            
            self.device = "cuda"
            
        except Exception as e:
            print(f"⚠️ GPU loading failed: {e}")
            print("Falling back to CPU...")
            
            try:
                self.whisperx_model = whisperx.load_model(
                    "large-v2", device="cpu", compute_type="int8")
                print("✅ WhisperX model loaded on CPU successfully")
                
                self.alignment_model, self.metadata = whisperx.load_align_model(
                    language_code="en", device="cpu")
                print("✅ Alignment model loaded on CPU successfully")
                
                self.device = "cpu"
                
            except Exception as cpu_error:
                print(f"❌ CPU loading also failed: {cpu_error}")
                raise RuntimeError(f"Failed to load models on both GPU and CPU: GPU error: {e}, CPU error: {cpu_error}")

        print(f"Transcription models loaded on {self.device}...")

    def get_youtube_duration(self, video_id: str) -> int:
        """Get YouTube video duration using HTML scraping only"""
        try:
            print(f"Extracting duration for video ID: {video_id}")
            
            # HTML scraping method for duration
            url = f"https://www.youtube.com/watch?v={video_id}"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
            
            print(f"Fetching HTML from: {url}")
            response = requests.get(url, headers=headers, timeout=20)
            
            if response.status_code == 200:
                html_content = response.text
                print("HTML content retrieved successfully")
                
                # Primary pattern: lengthSeconds
                duration_matches = re.findall(r'"lengthSeconds":"(\d+)"', html_content)
                if duration_matches:
                    duration = int(duration_matches[0])
                    print(f"Found duration from lengthSeconds: {duration} seconds")
                    return duration
                
                # Alternative pattern: approxDurationMs
                duration_matches = re.findall(r'"approxDurationMs":"(\d+)"', html_content)
                if duration_matches:
                    duration = int(duration_matches[0]) // 1000  # Convert from milliseconds
                    print(f"Found duration from approxDurationMs: {duration} seconds")
                    return duration
                
                # Third pattern: duration in ISO format
                duration_matches = re.findall(r'"duration":"PT(\d+)H?(\d+)M?(\d+)S"', html_content)
                if duration_matches:
                    for match in duration_matches:
                        hours = int(match[0]) if match[0] else 0
                        minutes = int(match[1]) if match[1] else 0
                        seconds = int(match[2]) if match[2] else 0
                        total_seconds = hours * 3600 + minutes * 60 + seconds
                        if total_seconds > 0:
                            print(f"Found duration from ISO format: {total_seconds} seconds")
                            return total_seconds
                
                # Fourth pattern: simpler duration pattern
                duration_matches = re.findall(r'"duration":\s*(\d+)', html_content)
                if duration_matches:
                    duration = int(duration_matches[0])
                    if duration > 30:  # Sanity check
                        print(f"Found duration from simple pattern: {duration} seconds")
                        return duration
                
                print("No duration patterns found in HTML content")
            else:
                print(f"HTML request failed with status: {response.status_code}")
                
        except Exception as e:
            print(f"Duration extraction failed: {e}")
        
        print("Duration extraction failed, using default of 300 seconds")
        return 300  # Default fallback

    def transcribe_video(self, base_dir: str, video_path: str) -> str:
        """Transcribe video using WhisperX with dynamic device selection"""
        audio_path = base_dir / "audio.wav"
        extract_cmd = f"ffmpeg -i {video_path} -vn -acodec pcm_s16le -ar 16000 -ac 1 {audio_path}"
        subprocess.run(extract_cmd, shell=True, check=True, capture_output=True)

        print(f"Starting transcription with WhisperX on {self.device}...")
        start_time = time.time()

        audio = whisperx.load_audio(str(audio_path))
        
        # Use appropriate batch size based on device
        batch_size = 16 if self.device == "cuda" else 8
        result = self.whisperx_model.transcribe(audio, batch_size=batch_size)

        # Perform alignment using the detected device
        result = whisperx.align(
            result["segments"],
            self.alignment_model,
            self.metadata,
            audio,
            device=self.device,
            return_char_alignments=False
        )

        duration = time.time() - start_time
        print(f"Transcription and alignment took {duration:.2f} seconds on {self.device}")

        segments = []
        if "word_segments" in result:
            for word_segment in result["word_segments"]:
                segments.append({
                    "start": word_segment["start"],
                    "end": word_segment["end"],
                    "word": word_segment["word"],
                })

        print(f"✅ Transcription complete: {len(segments)} word segments extracted")
        return json.dumps(segments)

    @modal.fastapi_endpoint(method="POST")
    def process_video(self, request: ProcessVideoRequest, token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
        """Process video that's already uploaded to S3"""
        s3_key = request.s3_key
        chunks_array = request.chunks

        print(f"🎬 Starting video processing for S3 key: {s3_key}")
        print(f"📊 Chunks array provided: {chunks_array}")

        if token.credentials != os.environ["AUTH_TOKEN"]:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Incorrect bearer token", 
                                headers={"WWW-Authenticate": "Bearer"})

        if not chunks_array or not isinstance(chunks_array, list) or len(chunks_array) == 0:
            raise HTTPException(status_code=400, detail="Missing or invalid 'chunks' array in request.")

        run_id = str(uuid.uuid4())
        base_dir = pathlib.Path("/tmp") / run_id
        base_dir.mkdir(parents=True, exist_ok=True)
        print(f"📁 Created temp directory: {base_dir}")

        try:
            # Step 1: Download video file from S3
            print("📥 Step 1: Downloading video from S3...")
            video_path = base_dir / "input.mp4"
            s3_client = boto3.client("s3")
            
            try:
                s3_client.download_file("ai-podcast-clipper", s3_key, str(video_path))
                print(f"✅ Video downloaded successfully: {video_path}")
                file_size = video_path.stat().st_size
                print(f"📊 Downloaded file size: {file_size / (1024*1024):.2f} MB")
            except Exception as e:
                print(f"❌ S3 download failed: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to download video from S3: {e}")

            # Step 1.5: Generate thumbnail for main/original video
            print("🖼️ Generating thumbnail for main/original video...")
            main_thumbnail_path = base_dir / "main_thumbnail.jpg"
            thumb_cmd = f"ffmpeg -i {video_path} -ss 0 -vframes 1 -q:v 2 {main_thumbnail_path}"
            subprocess.run(thumb_cmd, shell=True, check=True, capture_output=True, text=True)
            main_thumbnail_s3_key = f"{os.path.dirname(s3_key)}/main_thumbnail.jpg"
            s3_client.upload_file(str(main_thumbnail_path), "ai-podcast-clipper", main_thumbnail_s3_key)
            print(f"Uploaded main video thumbnail to S3: {main_thumbnail_s3_key}")
            # Update Postgres with the presigned URL for the main video thumbnail
            update_project_thumbnail_url_in_postgres(s3_key, main_thumbnail_s3_key)

            # Step 2: Get video duration using ffprobe
            print("⏱️ Step 2: Extracting video duration...")
            try:
                result = subprocess.run(
                    ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", str(video_path)],
                    capture_output=True, text=True, check=True
                )
                video_duration = float(result.stdout.strip())
                print(f"✅ Video duration: {video_duration} seconds ({video_duration/60:.1f} minutes)")
            except Exception as e:
                print(f"⚠️ Could not get video duration: {e}, using default 300s")
                video_duration = 300

            # Step 3: Transcription
            print("🎤 Step 3: Starting transcription...")
            try:
                transcript_segments_json = self.transcribe_video(base_dir, video_path)
                transcript_segments = json.loads(transcript_segments_json)
                print(f"✅ Transcription complete: {len(transcript_segments)} segments")
            except Exception as e:
                print(f"❌ Transcription failed: {e}")
                raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

            # Step 4: Create chunks (from explicit boundaries only)
            print("✂️ Step 4: Creating chunks...")
            try:
                time_chunks = create_video_chunks_from_boundaries(video_path, chunks_array, base_dir)
                print(f"✅ Created {len(time_chunks)} chunks")
                for i, chunk in enumerate(time_chunks):
                    print(f"  Chunk {i+1}: {chunk['start_time']:.1f}s - {chunk['end_time']:.1f}s ({chunk['end_time'] - chunk['start_time']:.1f}s duration)")
            except Exception as e:
                print(f"❌ Chunk creation failed: {e}")
                raise HTTPException(status_code=500, detail=f"Chunk creation failed: {e}")

            # Step 5: Process clips (limit to 10 clips)
            print("🎞️ Step 5: Processing clips...")
            clips_to_process = time_chunks[:10]
            processed_clips = 0
            clips_results = []
            
            for index, chunk in enumerate(clips_to_process):
                try:
                    print(f"📹 Processing clip {index+1}/{len(clips_to_process)}: {chunk['start_time']:.1f}s to {chunk['end_time']:.1f}s")
                    process_result = process_simple_clip(base_dir, video_path, s3_key,
                                       chunk["start_time"], chunk["end_time"], index)
                    processed_clips += 1
                    clips_results.append(process_result)
                    print(f"✅ Clip {index+1} processed successfully")
                except Exception as e:
                    print(f"❌ Failed to process clip {index+1}: {e}")
                    # Continue with other clips instead of failing completely

            print(f"🎉 Processing complete! {processed_clips}/{len(clips_to_process)} clips processed successfully")
            return {
                "success": True, 
                "clips_processed": processed_clips, 
                "total_clips": len(clips_to_process),
                "total_duration": video_duration,
                "device_used": self.device,
                "transcription": transcript_segments_json,  # Include transcription data
                "clips": clips_results,
                "main_thumbnail_s3_key": main_thumbnail_s3_key
            }

        except HTTPException:
            # Re-raise HTTP exceptions as-is
            raise
        except Exception as e:
            print(f"❌ Unexpected error during processing: {e}")
            print(f"Error type: {type(e).__name__}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
        finally:
            # Cleanup
            if base_dir.exists():
                print(f"🧹 Cleaning up temp dir: {base_dir}")
                shutil.rmtree(base_dir, ignore_errors=True)
                print("✅ Cleanup complete")

    @modal.fastapi_endpoint(method="POST")
    def process_youtube_video(self, request: ProcessYouTubeRequest, token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
        """Download and process YouTube video directly"""
        youtube_url = request.youtube_url
        chunk_config = request.chunk_config

        if token.credentials != os.environ["AUTH_TOKEN"]:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Incorrect bearer token", 
                                headers={"WWW-Authenticate": "Bearer"})

        run_id = str(uuid.uuid4())
        base_dir = pathlib.Path("/tmp") / run_id
        base_dir.mkdir(parents=True, exist_ok=True)

        try:
            # Download YouTube video
            video_path = base_dir / "input.%(ext)s"
            print(f"Downloading YouTube video: {youtube_url}")
            metadata = download_youtube_video(youtube_url, str(video_path))
            
            # Find the actual downloaded file
            downloaded_files = list(base_dir.glob("input.*"))
            if not downloaded_files:
                raise HTTPException(status_code=400, detail="Failed to download video")
            
            actual_video_path = downloaded_files[0]
            print(f"Downloaded video to: {actual_video_path}")

            # Get video duration from metadata or ffprobe
            video_duration = metadata.get('duration', 0)
            if not video_duration or video_duration <= 0:
                try:
                    result = subprocess.run(
                        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", str(actual_video_path)],
                        capture_output=True, text=True, check=True
                    )
                    video_duration = float(result.stdout.strip())
                    print(f"Video duration from ffprobe: {video_duration} seconds")
                except Exception as e:
                    print(f"Could not get video duration: {e}, using default 300s")
                    video_duration = 300
            else:
                print(f"Video duration from metadata: {video_duration} seconds")

            # Upload to S3 for processing
            s3_key = f"youtube_videos/{run_id}/{actual_video_path.name}"
            s3_client = boto3.client("s3")
            s3_client.upload_file(str(actual_video_path), "ai-podcast-clipper", s3_key)
            print(f"Uploaded to S3: {s3_key}")

            # 1. Transcription
            transcript_segments_json = self.transcribe_video(base_dir, actual_video_path)
            transcript_segments = json.loads(transcript_segments_json)

            # 2. Create time-based chunks
            print("Creating time-based chunks")
            time_chunks = create_video_chunks(actual_video_path, chunk_config, base_dir)

            # 3. Process clips (limit to 10 clips)
            for index, chunk in enumerate(time_chunks[:10]):
                print(f"Processing clip {index} from {chunk['start_time']} to {chunk['end_time']}")
                process_result = process_simple_clip(base_dir, actual_video_path, s3_key,
                                   chunk["start_time"], chunk["end_time"], index)

            return {
                "success": True, 
                "clips_processed": len(time_chunks[:10]),
                "metadata": metadata,
                "s3_key": s3_key,
                "total_duration": video_duration,
                "clips": [process_result["clip_s3_key"], process_result["thumbnail_s3_key"]]
            }

        finally:
            # Cleanup
            if base_dir.exists():
                print(f"Cleaning up temp dir: {base_dir}")
                shutil.rmtree(base_dir, ignore_errors=True)

    @modal.fastapi_endpoint(method="GET")
    def get_youtube_metadata(self, url: str):
        """Get YouTube video metadata using web scraping only (no yt-dlp)"""
        
        try:
            print(f"Extracting metadata via web scraping for: {url}")
            
            # Extract video ID
            video_id = extract_video_id(url)
            if not video_id:
                return {
                    "success": False,
                    "message": "Could not extract video ID from URL",
                    "data": None
                }
            
            print(f"Extracted video ID: {video_id}")
            
            # Step 1: Get basic metadata from OEmbed API
            metadata = {
                'id': video_id,
                'title': f'YouTube Video {video_id}',
                'description': 'Video description not available',
                'duration': 300,  # Default, will be updated by duration extraction
                'channel': 'Unknown Channel',
                'thumbnail': f'https://img.youtube.com/vi/{video_id}/maxresdefault.jpg',
                'upload_date': '20240101',
                'view_count': 0,
            }
            
            # Try OEmbed API for title, channel, and thumbnail
            try:
                print("Fetching OEmbed data...")
                oembed_url = f"https://www.youtube.com/oembed?url={url}&format=json"
                response = requests.get(oembed_url, timeout=10)
                if response.status_code == 200:
                    oembed_data = response.json()
                    print(f"OEmbed success: {oembed_data.get('title', 'N/A')}")
                    
                    # Update metadata with OEmbed data
                    metadata.update({
                        'title': oembed_data.get('title', metadata['title']),
                        'channel': oembed_data.get('author_name', metadata['channel']),
                        'thumbnail': oembed_data.get('thumbnail_url', metadata['thumbnail']),
                    })
                else:
                    print(f"OEmbed failed with status {response.status_code}")
            except Exception as e:
                print(f"OEmbed request failed: {e}")
            
            # Step 2: Get duration from HTML scraping
            try:
                print("Extracting duration from YouTube HTML...")
                duration = self.get_youtube_duration(video_id)
                metadata['duration'] = duration
                print(f"Duration extracted: {duration} seconds")
            except Exception as e:
                print(f"Duration extraction failed: {e}")
                # Keep default duration of 300
            
            print(f"Final metadata: title='{metadata['title']}', duration={metadata['duration']}s, channel='{metadata['channel']}'")
            
            return {
                "success": True,
                "data": metadata,
                "method": "web_scraping"
            }
            
        except Exception as e:
            print(f"Web scraping metadata extraction failed: {str(e)}")
            
            # Final fallback to basic metadata
            video_id = extract_video_id(url)
            if video_id:
                fallback_metadata = get_youtube_metadata_api(video_id)
                return {
                    "success": True,
                    "data": fallback_metadata,
                    "method": "fallback"
                }
            
            return {
                "success": False,
                "message": f"All metadata extraction methods failed: {str(e)}",
                "data": None
            }

    @modal.fastapi_endpoint(method="POST")
    def generate_thumbnail(self, request: dict, token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
        """Generate a thumbnail from a video at a specific time offset"""
        try:
            # Verify auth token
            if token.credentials != os.environ["AUTH_TOKEN"]:
                raise HTTPException(status_code=401, detail="Invalid token")
            
            video_url = request.get("video_url")
            time_offset = request.get("time_offset", 5)
            width = request.get("width", 480)
            height = request.get("height", 270)
            output_format = request.get("output_format", "jpeg")
            
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
                    
                    # Use requests instead of wget
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
    """Test the simplified app"""
    import requests

    ai_podcast_clipper = AiPodcastClipper()

    # Test YouTube processing
    url = ai_podcast_clipper.process_youtube_video.web_url
    payload = {
        "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer 123123"
    }

    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    result = response.json()
    print(result)
