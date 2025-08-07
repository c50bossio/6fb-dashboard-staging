#!/bin/bash
set -e

echo "🌊 Deploying Coder to DigitalOcean App Platform..."

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "❌ DigitalOcean CLI (doctl) not found."
    echo "📥 Install it from: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    echo "Then run: doctl auth init"
    exit 1
fi

# Create app.yaml for DigitalOcean App Platform
cat > app.yaml << EOF
name: coder-6fb-ai-agent
services:
- name: coder
  source_dir: /
  github:
    repo: your-username/coder-deployment
    branch: main
  run_command: /opt/coder/start-coder.sh
  environment_slug: docker
  instance_count: 1
  instance_size_slug: basic-xxs
  http_port: 7080
  envs:
  - key: CODER_HTTP_ADDRESS
    value: 0.0.0.0:7080
  - key: CODER_TELEMETRY
    value: "false"
  - key: PORT
    value: "7080"
EOF

echo "📝 Created app.yaml for DigitalOcean"
echo ""
echo "🔧 Next steps:"
echo "1. Push this code to a GitHub repository"
echo "2. Update the 'repo' field in app.yaml with your GitHub repo"
echo "3. Run: doctl apps create app.yaml"
echo "4. Or use the DigitalOcean web console to deploy"
echo ""
echo "💰 Estimated cost: ~$12/month for basic-xxs instance"