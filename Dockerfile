# ============================================================
# Stage 1: Build React Frontend
# ============================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ============================================================
# Stage 2: Production Python Backend
# ============================================================
FROM python:3.11-slim

# System dependencies for PDF manipulation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend application code and sample files
COPY backend/ ./backend/
COPY samples/ ./samples/

# Copy built frontend from Stage 1 into frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose HTTP port
EXPOSE 8000

ENV PORT=8000
ENV HOST=0.0.0.0
ENV PYTHONPATH=/app

# Start production server
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
