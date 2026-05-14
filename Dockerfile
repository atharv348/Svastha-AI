# Use Node.js for building the frontend
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

COPY frontend/ .
RUN npm run build

# Final production image
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed for the backend (OpenCV, DeepFace, etc.)
RUN apt-get update && apt-get install -y \
    nginx \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install them in the final stage
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy src directory for shared modules (e.g., image_preprocessor)
COPY src/ ./src/

# Copy frontend build from the builder stage
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copy nginx configuration
COPY nginx.conf /etc/nginx/sites-available/default
RUN ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

# Expose ports
EXPOSE 80 8002

# Start script
COPY start.sh .
RUN chmod +x start.sh

CMD ["./start.sh"]
