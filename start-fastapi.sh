#!/bin/bash
cd /app
exec uvicorn fastapi_backend:app --host 0.0.0.0 --port 8000 --reload