#!/usr/bin/env bash
# Start the model server (if needed) and the SeeForMe web app.   Usage: ./run.sh
set -e
cd "$(dirname "$0")"

if [ ! -x .venv/bin/uvicorn ]; then
  echo "Setting up the Python environment (first run only)..."
  python3.11 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
fi

if ! curl -s 127.0.0.1:11434/api/version >/dev/null; then
  echo "Starting the model server (Ollama)..."
  OLLAMA_MAX_LOADED_MODELS=1 OLLAMA_FLASH_ATTENTION=1 OLLAMA_KV_CACHE_TYPE=q8_0 OLLAMA_KEEP_ALIVE=30m \
    ollama serve > /tmp/seeforme-ollama.log 2>&1 &
  sleep 3
fi

if ! ollama list | grep -q "qwen2.5vl:3b"; then
  echo "Downloading the model (about 3 GB, first run only)..."
  ollama pull qwen2.5vl:3b
fi

echo "Open http://localhost:8000   (close Chrome and other heavy apps for the best speed)"
exec .venv/bin/uvicorn app.server:app --host 127.0.0.1 --port 8000
