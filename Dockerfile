FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements-minimal.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements-minimal.txt

# Copy application code
COPY test-main.py .

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "test-main.py"]