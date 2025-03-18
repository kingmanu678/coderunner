from flask import Flask, request, jsonify, send_from_directory
import requests
import time
import os

app = Flask(__name__)

# Judge0 API configuration
JUDGE0_API_URL = "https://judge0-ce.p.rapidapi.com/submissions"
JUDGE0_API_KEY = "2e65351eefmsh7e4cfc33d780ecdp161421jsn91e4a1722595"

LANGUAGE_IDS = {
    'python': 71,
    'cpp': 54,
    'java': 62,
    'javascript': 63
}

# Serve the code editor page
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

# Handle code execution with Judge0 API
@app.route('/run', methods=['POST'])
def run_code():
    code = request.json.get('code')
    language = request.json.get('language', 'python')
    input_data = request.json.get('input', '')
    java_class_name = request.json.get('javaClassName', '').strip()

    if language not in LANGUAGE_IDS:
        return jsonify({'output': 'Error: Unsupported language'})

    payload = {
        'source_code': code,
        'language_id': LANGUAGE_IDS[language],
        'stdin': input_data,
        'expected_output': None
    }
    if language == 'java' and java_class_name:
        payload['source_code'] = code.replace(f'public class {java_class_name}', f'class {java_class_name}')

    headers = {
        'X-RapidAPI-Key': JUDGE0_API_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        'Content-Type': 'application/json'
    }

    try:
        response = requests.post(JUDGE0_API_URL, json=payload, headers=headers)
        response.raise_for_status()
        token = response.json().get('token')
    except requests.RequestException as e:
        return jsonify({'output': f'Error: Failed to submit code - {str(e)}'})

    for _ in range(10):
        result = requests.get(f"{JUDGE0_API_URL}/{token}", headers=headers).json()
        status = result.get('status', {}).get('id')
        if status in [1, 2]:
            time.sleep(1)
            continue
        output = ''
        if result.get('stdout'):
            output += result['stdout']
        if result.get('stderr'):
            output += f"Error: {result['stderr']}"
        if result.get('compile_output'):
            output += f"Compilation Error: {result['compile_output']}"
        if not output and result.get('message'):
            output = f"Error: {result['message']}"
        return jsonify({'output': output or 'No output'})
    return jsonify({'output': 'Error: Execution timed out or took too long'})

# Serve static files (CSS, JS)
@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    app.run(debug=True)