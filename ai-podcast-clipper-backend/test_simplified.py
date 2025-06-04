#!/usr/bin/env python3

"""
Simple test to verify the simplified backend setup
"""

import json
import pathlib
import subprocess

def test_imports():
    """Test that basic imports work"""
    try:
        import boto3
        import modal
        import yt_dlp
        print("✅ All basic imports successful")
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def test_youtube_download():
    """Test basic yt-dlp functionality"""
    try:
        import yt_dlp
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extractaudio': False,
            'extract_flat': False,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Test with a simple video - this won't download, just extract info
            info = ydl.extract_info('https://www.youtube.com/watch?v=dQw4w9WgXcQ', download=False)
            
            print(f"✅ YouTube metadata extraction successful")
            print(f"   Title: {info.get('title', 'Unknown')}")
            print(f"   Duration: {info.get('duration', 0)} seconds")
            return True
            
    except Exception as e:
        print(f"❌ YouTube test failed: {e}")
        return False

def test_ffmpeg():
    """Test that ffmpeg is available"""
    try:
        result = subprocess.run(['ffmpeg', '-version'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✅ FFmpeg is available")
            return True
        else:
            print("❌ FFmpeg not working properly")
            return False
    except Exception as e:
        print(f"❌ FFmpeg test failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing simplified AI Podcast Clipper setup...\n")
    
    all_tests_passed = True
    
    print("1. Testing imports...")
    all_tests_passed &= test_imports()
    print()
    
    print("2. Testing YouTube functionality...")
    all_tests_passed &= test_youtube_download()
    print()
    
    print("3. Testing FFmpeg...")
    all_tests_passed &= test_ffmpeg()
    print()
    
    if all_tests_passed:
        print("🎉 All tests passed! Simplified setup is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the errors above.") 