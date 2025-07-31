#!/usr/bin/env python3
"""
Simple FastAPI server for Railway deployment
"""
import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="6FB AI Agent System")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "6FB AI Agent System Backend", "status": "running"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "6fb-ai-backend"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)