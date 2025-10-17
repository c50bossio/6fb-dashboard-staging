# 🚀 AI Agent System - Production Deployment Guide

## Quick Start

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env.local

# Add your API keys
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
OPENAI_API_KEY=your_openai_key
```

### 2. Docker Deployment
```bash
# Start all services
./docker-dev-start.sh

# Verify health
curl http://localhost:9999/api/health
```

### 3. Cloud Deployment
```bash
# Deploy to Vercel
vercel --prod

# Deploy to Railway
railway up
```

## Testing Endpoints

- Voice Assistant: `http://localhost:9999/test-voice`
- Predictions: `http://localhost:9999/test-predictions`
- Collaboration: `http://localhost:9999/test-collaboration`
- Full Dashboard: `http://localhost:9999/ai-testing-dashboard`

## Monitoring

- System Health: `/api/health`
- AI Metrics: `/api/ai/metrics`
- Error Logs: Check Docker logs or Vercel dashboard

## Support

For issues or questions, check the [AI Enhancement Summary](../AI_ENHANCEMENT_SUMMARY.md)