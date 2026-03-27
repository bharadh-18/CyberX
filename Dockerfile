# Use official lightweight Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies needed by scikit-learn and cryptography
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies first (Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend application code
COPY app/ ./app/

# Copy Firebase service account key
COPY serviceAccountKey.json .

# Set environment variable for Firebase Admin SDK
ENV GOOGLE_APPLICATION_CREDENTIALS="/app/serviceAccountKey.json"

# Cloud Run expects port 8080
EXPOSE 8080

# Start with gunicorn for production (uvicorn worker)
CMD ["gunicorn", "app.main:app", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8080", "--timeout", "120"]
