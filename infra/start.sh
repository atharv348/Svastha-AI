#!/bin/bash
# Start backend using module mode to ensure correct path resolution
cd /app/backend
python -m app.main &

# Start Nginx for frontend
nginx -g "daemon off;"
