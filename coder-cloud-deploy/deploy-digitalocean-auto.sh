#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🌊 Automated DigitalOcean Coder Deployment"
echo "=========================================="

# Step 1: Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    print_error "DigitalOcean CLI (doctl) not found. Installing..."
    brew install doctl
    print_success "doctl installed successfully"
fi

# Step 2: Check authentication
print_status "Checking DigitalOcean authentication..."
if ! doctl account get &> /dev/null; then
    print_warning "Not authenticated with DigitalOcean."
    echo ""
    echo "🔑 To authenticate:"
    echo "1. Go to: https://cloud.digitalocean.com/account/api/tokens"
    echo "2. Create a new Personal Access Token"
    echo "3. Copy the token"
    echo "4. Run: doctl auth init"
    echo "5. Paste your token when prompted"
    echo ""
    echo "After authentication, run this script again."
    exit 1
else
    print_success "Already authenticated with DigitalOcean"
fi

# Step 3: Create droplet
DROPLET_NAME="coder-6fb-$(date +%s)"
print_status "Creating DigitalOcean droplet: $DROPLET_NAME"

# Create droplet with Docker pre-installed
doctl compute droplet create $DROPLET_NAME \
    --image docker-20-04 \
    --size s-2vcpu-2gb \
    --region nyc1 \
    --ssh-keys $(doctl compute ssh-key list --format ID --no-header | head -1) \
    --wait

print_success "Droplet created successfully"

# Step 4: Get droplet IP
print_status "Getting droplet IP address..."
DROPLET_IP=$(doctl compute droplet list --format Name,PublicIPv4 --no-header | grep $DROPLET_NAME | awk '{print $2}')
print_success "Droplet IP: $DROPLET_IP"

# Step 5: Wait for droplet to be ready
print_status "Waiting for droplet to be ready (60 seconds)..."
sleep 60

# Step 6: Deploy Coder via SSH
print_status "Deploying Coder to droplet..."

# Create deployment script
cat > /tmp/deploy-coder.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Installing Coder on DigitalOcean droplet..."

# Wait for Docker to be ready
sleep 30

# Run Coder container
docker run -d \
  --name coder \
  -p 80:7080 \
  -v coder_data:/home/coder/.config/coderv2 \
  --restart unless-stopped \
  -e CODER_HTTP_ADDRESS=0.0.0.0:7080 \
  -e CODER_ACCESS_URL=http://DROPLET_IP_PLACEHOLDER \
  -e CODER_TELEMETRY=false \
  codercom/coder:v2.24.2

echo "✅ Coder deployed successfully!"
echo "🌐 Access your Coder instance at: http://DROPLET_IP_PLACEHOLDER"
EOF

# Replace placeholder with actual IP
sed -i '' "s/DROPLET_IP_PLACEHOLDER/$DROPLET_IP/g" /tmp/deploy-coder.sh

# Execute deployment on droplet
ssh -o StrictHostKeyChecking=no root@$DROPLET_IP 'bash -s' < /tmp/deploy-coder.sh

# Clean up temp file
rm /tmp/deploy-coder.sh

# Step 7: Final information
echo ""
print_success "🎉 Deployment Complete!"
echo "=============================="
echo ""
echo -e "${GREEN}🌐 Your Coder instance is available at:${NC}"
echo -e "${BLUE}   http://$DROPLET_IP${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Visit the URL above (wait 2-3 minutes for full startup)"
echo "2. Create your admin account (first user becomes admin)"
echo "3. Upload your 6FB AI Agent template"
echo "4. Create workspaces and start coding remotely!"
echo ""
echo -e "${YELLOW}📱 Access from any device:${NC}"
echo "• Desktop/Laptop: Full VS Code experience"
echo "• Tablet: Touch-friendly coding"
echo "• Phone: View and edit code on the go"
echo ""
echo -e "${YELLOW}💰 Cost: ~\$24/month for this droplet${NC}"
echo -e "${YELLOW}🔧 Manage: https://cloud.digitalocean.com/droplets${NC}"
echo ""

# Open in browser
if command -v open &> /dev/null; then
    print_status "Opening Coder instance in browser..."
    open "http://$DROPLET_IP"
fi

print_success "Automated deployment completed successfully!"