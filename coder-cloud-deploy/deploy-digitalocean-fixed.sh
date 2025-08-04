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

echo "🌊 Fixed DigitalOcean Coder Deployment"
echo "======================================"

# Step 1: Check authentication
print_status "Checking DigitalOcean authentication..."
if ! doctl account get &> /dev/null; then
    print_error "Not authenticated with DigitalOcean. Please run: export DIGITALOCEAN_ACCESS_TOKEN=\"your_token\""
    exit 1
else
    print_success "Authenticated with DigitalOcean"
fi

# Step 2: Check/Create SSH key
print_status "Checking SSH keys..."
SSH_KEY_NAME="coder-deployment-key"

# Check if SSH key exists locally
if [ ! -f ~/.ssh/id_rsa.pub ]; then
    print_status "Creating SSH key..."
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N "" -C "coder-deployment"
    print_success "SSH key created"
fi

# Check if key exists in DigitalOcean
if ! doctl compute ssh-key list --format Name --no-header | grep -q "$SSH_KEY_NAME"; then
    print_status "Adding SSH key to DigitalOcean..."
    doctl compute ssh-key import $SSH_KEY_NAME --public-key-file ~/.ssh/id_rsa.pub
    print_success "SSH key added to DigitalOcean"
else
    print_success "SSH key already exists in DigitalOcean"
fi

# Get SSH key ID
SSH_KEY_ID=$(doctl compute ssh-key list --format ID,Name --no-header | grep "$SSH_KEY_NAME" | awk '{print $1}')
print_status "Using SSH key ID: $SSH_KEY_ID"

# Step 3: Create droplet
DROPLET_NAME="coder-6fb-$(date +%s)"
print_status "Creating DigitalOcean droplet: $DROPLET_NAME"

# Create droplet with Docker pre-installed
doctl compute droplet create $DROPLET_NAME \
    --image docker-20-04 \
    --size s-2vcpu-2gb \
    --region nyc1 \
    --ssh-keys $SSH_KEY_ID \
    --wait

print_success "Droplet created successfully"

# Step 4: Get droplet IP
print_status "Getting droplet IP address..."
DROPLET_IP=$(doctl compute droplet list --format Name,PublicIPv4 --no-header | grep $DROPLET_NAME | awk '{print $2}')
print_success "Droplet IP: $DROPLET_IP"

# Step 5: Wait for droplet to be ready
print_status "Waiting for droplet to be ready (90 seconds)..."
sleep 90

# Step 6: Deploy Coder via SSH
print_status "Deploying Coder to droplet..."

# Create deployment script
cat > /tmp/deploy-coder.sh << EOF
#!/bin/bash
set -e

echo "🚀 Installing Coder on DigitalOcean droplet..."

# Wait for Docker to be ready
sleep 30

# Pull Coder image
docker pull coder/coder:v2.24.2

# Run Coder container
docker run -d \
  --name coder \
  -p 80:7080 \
  -v coder_data:/home/coder/.config/coderv2 \
  --restart unless-stopped \
  -e CODER_HTTP_ADDRESS=0.0.0.0:7080 \
  -e CODER_ACCESS_URL=http://$DROPLET_IP \
  -e CODER_TELEMETRY=false \
  coder/coder:v2.24.2

echo "✅ Coder deployed successfully!"
echo "🌐 Access your Coder instance at: http://$DROPLET_IP"
EOF

# Execute deployment on droplet
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 root@$DROPLET_IP 'bash -s' < /tmp/deploy-coder.sh

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
echo -e "${YELLOW}🗑️ To delete later: doctl compute droplet delete $DROPLET_NAME${NC}"
echo ""

# Open in browser
if command -v open &> /dev/null; then
    print_status "Opening Coder instance in browser..."
    open "http://$DROPLET_IP"
fi

print_success "Automated deployment completed successfully!"