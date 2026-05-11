from flask import Flask, send_from_directory
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIST = BASE_DIR / 'frontend' / 'dist'

app = Flask(__name__, static_folder=str(FRONTEND_DIST), static_url_path='')


@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIST, 'index.html')

@app.route('/<path:path>')
def server_react(path):
    file_path = FRONTEND_DIST / path
    if file_path.exists():
        return send_from_directory(FRONTEND_DIST, path)

    return send_from_directory(FRONTEND_DIST, 'index.html')


if __name__ == "__main__":
    app.run(debug=True)
