#!/bin/bash
# Start Python API in the background on port 8000
echo "Starting Python API on port 8000..."
cd python-service
uvicorn api:app --host 0.0.0.0 --port 8000 &
cd ..

# Start Node.js API in the foreground
echo "Starting Node.js API..."
npm start
