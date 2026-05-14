# EC2 Instance Deployment for SvasthaAI (Docker Only)

## Prerequisites
- AWS Account
- Docker Hub account (you are using `joshi343`)

## Deployment Steps

1. **Build and Push Docker Image** (Local Machine)
   ```bash
   # Navigate to the project root
   cd Svastha-AI
   
   # Build the production image
   docker build -t joshi343/svastha-ai:latest -f infra/Dockerfile .
   
   # Push the image to Docker Hub
   docker push joshi343/svastha-ai:latest
   ```

2. **Launch and Setup EC2 Instance**
   - **OS**: Ubuntu 22.04 LTS.
   - **Instance Type**: `t3.medium` or higher (minimum 4GB RAM recommended for ML models).
   - **Security Group**: Open ports `80` (HTTP) and `22` (SSH).

3. **Install Docker on EC2**
   Connect to your instance via SSH and run:
   ```bash
   sudo apt-get update
   sudo apt-get install -y docker.io docker-compose
   sudo systemctl start docker
   sudo systemctl enable docker
   # Add your user to the docker group to run without sudo
   sudo usermod -aG docker $USER
   # Logout and login again for group changes to take effect
   ```

4. **Run the Application on EC2**
   Create a directory and setup the `docker-compose.yml`:
   ```bash
   mkdir svastha-ai && cd svastha-ai
   # Create a .env file for secrets
   echo "GROQ_API_KEY=your_actual_key_here" > .env
   ```
   Copy the `infra/docker-compose.yml` from your local machine to this folder on EC2, then run:
   ```bash
   docker-compose up -d
   ```

## Files in this workspace:
- `infra/Dockerfile`: Multi-stage build for frontend and backend.
- `infra/nginx.conf`: Nginx configuration for reverse proxy.
- `infra/docker-compose.yml`: Docker orchestration.
- `infra/start.sh`: Container entrypoint script.

