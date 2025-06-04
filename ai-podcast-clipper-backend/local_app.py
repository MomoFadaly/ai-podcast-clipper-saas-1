#!/usr/bin/env python3

"""
Local FastAPI app for testing YouTube metadata endpoint
Run with: uvicorn local_app:app --reload --port 8000
"""

from fastapi import FastAPI
import yt_dlp

app = FastAPI(title="YouTube Metadata API - Local Testing")

@app.get("/")
def root():
    return {"message": "YouTube Metadata API - Local Testing Server"}

@app.get("/api/youtube/metadata")
def get_youtube_metadata(url: str):
    """Get YouTube video metadata using yt-dlp - Local testing version"""
    
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extractaudio': False,
            'extract_flat': False,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract video info without downloading
            info = ydl.extract_info(url, download=False)
            
            # Extract relevant metadata
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
            
            return {
                "success": True,
                "data": metadata
            }
            
    except Exception as e:
        print(f"Error fetching YouTube metadata: {str(e)}")
        return {
            "success": False,
            "message": f"Failed to fetch video metadata: {str(e)}",
            "data": None
        }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "youtube-metadata-api"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 