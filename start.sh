#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================================="
echo " Starting AuraPDF Precision Editor"
echo "=========================================================="

# Ensure sample files exist
if [ ! -f "samples/offer_letter.pdf" ]; then
    echo "Generating sample test PDF documents..."
    PYTHONPATH=. ./venv/bin/python backend/samples.py
fi

# Build frontend if dist not present
if [ ! -d "frontend/dist" ]; then
    echo "Building frontend application..."
    (cd frontend && npm run build)
fi

echo "Starting unified web server on http://127.0.0.1:8000 ..."
echo "Open your browser to: http://127.0.0.1:8000"
echo "Press Ctrl+C to stop."
echo "=========================================================="

PYTHONPATH=. ./venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
