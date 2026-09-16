import urllib.request
import json

api_key = "AIzaSyBjPun3IXYPFn3QwTkCvlEoKV_Z3QlBEP4"
# Common models from documentation
models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"]
versions = ["v1beta", "v1"]

for model in models:
    for version in versions:
        url = f"https://generativelanguage.googleapis.com/{version}/models/{model}:generateContent?key={api_key}"
        data = {"contents": [{"parts": [{"text": "Hello"}]}]}
        json_data = json.dumps(data).encode('utf-8')
        req = urllib.request.Request(url, data=json_data, headers={'Content-Type': 'application/json'}, method='POST')
        
        print(f"DEBUG: Trying {url}")
        try:
            with urllib.request.urlopen(req) as response:
                print(f"SUCCESS: {model} {version}")
                print(response.read().decode('utf-8'))
                exit(0)
        except Exception as e:
            print(f"FAILED: {model} {version} - {e}")
            if hasattr(e, 'read'):
                print(f"  Body: {e.read().decode('utf-8')}")
