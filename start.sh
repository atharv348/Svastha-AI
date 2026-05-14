#!/bin/bash
# Start backend
cd /app/backend
python main.py &

# Start Nginx for frontend
nginx -g "daemon off;"
