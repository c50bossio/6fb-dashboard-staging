#!/usr/bin/env python3
"""
Minimal test server for Railway deployment
"""

import os
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "Railway", "PORT": os.getenv("PORT", "not_set")}

@app.get("/health")
def health():
    return {"status": "ok", "service": "test"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    print(f"Starting server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)