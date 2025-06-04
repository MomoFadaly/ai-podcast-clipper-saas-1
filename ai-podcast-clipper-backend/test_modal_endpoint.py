#!/usr/bin/env python3

import requests
import json

def test_modal_youtube_endpoint():
    """Test the Modal-deployed YouTube metadata endpoint"""
    
    # Modal typically serves endpoints at URLs like:
    # https://username--app-name-function-name.modal.run
    # We need to find the exact URL
    
    # Test URLs to try (you'll need to replace with your actual Modal username)
    # The pattern is usually: https://username--app-name-function-name.modal.run
    
    # Let's try some common patterns
    potential_urls = [
        "https://ai-podcast-clipper-get-youtube-metadata.modal.run",
        "https://mo--ai-podcast-clipper-get-youtube-metadata.modal.run",
        "https://mo--ai-podcast-clipper-aipodcastclipper-get-youtube-metadata.modal.run"
    ]
    
    test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    
    print("Testing Modal YouTube metadata endpoints...")
    print(f"Test YouTube URL: {test_url}")
    print("-" * 60)
    
    for api_url in potential_urls:
        print(f"\nTrying endpoint: {api_url}")
        full_url = f"{api_url}?url={test_url}"
        
        try:
            response = requests.get(full_url, timeout=30)
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ SUCCESS! API Response:")
                print(json.dumps(data, indent=2))
                print(f"\n🎉 Working endpoint: {api_url}")
                return api_url
            else:
                print(f"❌ Error: {response.status_code}")
                print(f"Response: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print("❌ Connection Error: Endpoint not found or not accessible")
        except Exception as e:
            print(f"❌ Error: {str(e)}")
    
    print("\n❌ None of the tested endpoints worked.")
    print("You may need to check your Modal dashboard for the correct endpoint URL.")
    return None

if __name__ == "__main__":
    working_endpoint = test_modal_youtube_endpoint()
    if working_endpoint:
        print(f"\n✅ Use this endpoint in your frontend: {working_endpoint}")
    else:
        print("\n🔍 To find your endpoint URL:")
        print("1. Check Modal dashboard at https://modal.com/")
        print("2. Look for your ai-podcast-clipper app")
        print("3. Find the get_youtube_metadata endpoint URL") 