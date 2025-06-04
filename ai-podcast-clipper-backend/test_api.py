#!/usr/bin/env python3

import requests
import json

def test_youtube_metadata_api():
    """Test the YouTube metadata API endpoint locally"""
    
    # Test URL
    test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    
    # API endpoint (assuming local development)
    api_url = f"http://localhost:8000/api/youtube/metadata?url={test_url}"
    
    print(f"Testing YouTube metadata API...")
    print(f"Test URL: {test_url}")
    print(f"API endpoint: {api_url}")
    print("-" * 50)
    
    try:
        response = requests.get(api_url, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ API Response:")
            print(json.dumps(data, indent=2))
        else:
            print(f"❌ API Error:")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Make sure the FastAPI server is running")
        print("Run: uvicorn main:app --reload --port 8000")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_youtube_metadata_api() 