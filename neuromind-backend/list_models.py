import urllib.request
import json

api_key = "AIzaSyBjPun3IXYPFn3QwTkCvlEoKV_Z3QlBEP4"
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

print(f"DEBUG: Listing models from {url}")
try:
    with urllib.request.urlopen(url) as response:
        result = json.loads(response.read().decode('utf-8'))
        print("Available Models:")
        for model in result.get('models', []):
            print(f" - {model.get('name')} ({model.get('displayName')})")
except Exception as e:
    print(f"FAILED: {e}")
    if hasattr(e, 'read'):
        print(f"  Body: {e.read().decode('utf-8')}")
