#!/usr/bin/env python3
"""
Simple FastAPI Server for Testing Railway Deployment
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="6FB AI System - Railway Test")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "6FB AI System Backend - Railway Deployment Working!"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "6fb-ai-backend-staging",
        "environment": os.getenv("ENVIRONMENT", "unknown"),
        "railway_service": os.getenv("RAILWAY_SERVICE_NAME", "unknown")
    }

@app.get("/api/v1/health") 
async def health_v1():
    return {
        "status": "healthy",
        "service": "6fb-ai-backend-staging", 
        "version": "v1",
        "environment": os.getenv("ENVIRONMENT", "unknown"),
        "database": "not_connected_yet"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)