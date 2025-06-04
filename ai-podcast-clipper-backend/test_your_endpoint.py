#!/usr/bin/env python3

import requests
import json

def test_your_modal_endpoint():
    """Test your specific Modal YouTube metadata endpoint"""
    
    # Replace this with your actual Modal endpoint URL from the dashboard
    YOUR_ENDPOINT_URL = "https://YOUR_USERNAME--ai-podcast-clipper-aipodcastclipper-get-youtube-metadata.modal.run"
    
    test_video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    
    print("🧪 Testing Your Modal YouTube Metadata Endpoint")
    print("-" * 50)
    print(f"Endpoint: {YOUR_ENDPOINT_URL}")
    print(f"Test URL: {test_video_url}")
    print("-" * 50)
    
    try:
        full_url = f"{YOUR_ENDPOINT_URL}?url={test_video_url}"
        response = requests.get(full_url, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ SUCCESS! Your endpoint is working!")
            print("\nResponse:")
            print(json.dumps(data, indent=2))
            
            if data.get('success') and data.get('data'):
                video_data = data['data']
                print(f"\n📺 Video Title: {video_data.get('title', 'N/A')}")
                print(f"⏱️  Duration: {video_data.get('duration', 0)} seconds")
                print(f"📺 Channel: {video_data.get('channel', 'N/A')}")
                print(f"👀 Views: {video_data.get('view_count', 'N/A')}")
            
            print("\n🎉 Your frontend should now work!")
            return True
        else:
            print(f"❌ Error: {response.status_code}")
            try:
                error_data = response.json()
                print("Error details:", json.dumps(error_data, indent=2))
            except:
                print("Error response:", response.text)
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Check if the endpoint URL is correct")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    return False

if __name__ == "__main__":
    print("📋 Instructions:")
    print("1. Go to https://modal.com/ and log in")
    print("2. Find your 'ai-podcast-clipper' app")
    print("3. Look for the 'get_youtube_metadata' function")
    print("4. Copy the endpoint URL")
    print("5. Replace 'YOUR_ENDPOINT_URL' in this script with the actual URL")
    print("6. Run this script again")
    print("7. Update your frontend .env.local with the same URL")
    print("-" * 50)
    
    test_your_modal_endpoint() 