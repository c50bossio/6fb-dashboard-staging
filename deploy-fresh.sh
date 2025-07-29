#!/bin/bash
cd "/Users/bossio/6FB AI Agent System"

# Create responses file
cat > /tmp/vercel_responses << EOF
y
y
6fb-ai-unified-staging
y
EOF

# Deploy with responses
vercel --prod < /tmp/vercel_responses

# Cleanup
rm -f /tmp/vercel_responses