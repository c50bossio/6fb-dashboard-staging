# Coder Cloud Deployment - 6FB AI Agent System

Deploy your Coder development environment to the cloud for remote access from any device.

## 🚀 Quick Deploy Options

### Option 1: Railway (Recommended - Easiest)
```bash
cd coder-cloud-deploy
./deploy-railway.sh
```
- **Cost**: ~$5-10/month
- **Setup time**: 5 minutes
- **Features**: Automatic HTTPS, custom domain, easy scaling

### Option 2: DigitalOcean App Platform
```bash
cd coder-cloud-deploy  
./deploy-digitalocean.sh
```
- **Cost**: ~$12/month
- **Setup time**: 10 minutes
- **Features**: Reliable, good performance, managed infrastructure

### Option 3: Manual Docker Deployment
```bash
cd coder-cloud-deploy
docker-compose up -d
```
- Use on any VPS (DigitalOcean, Linode, AWS EC2, etc.)
- **Cost**: ~$5-20/month depending on provider
- **Setup time**: 15-30 minutes

## 🌐 What You Get

After deployment, you'll have:

- **Public Coder URL**: `https://your-deployment.railway.app`
- **Remote VS Code**: Access from any device with a browser
- **6FB AI Agent Template**: Pre-loaded and ready to use
- **Persistent Workspaces**: Your code saved between sessions
- **HTTPS Security**: Automatic SSL certificates

## 📱 Device Access

Once deployed, access your development environment from:

- **💻 Laptop/Desktop**: Full VS Code experience
- **📱 Phone/Tablet**: Mobile coding with touch-friendly interface  
- **🌍 Any Browser**: Chrome, Safari, Firefox, Edge
- **☁️ Any Location**: Coffee shop, home, office, anywhere with internet

## 🔧 Post-Deployment Setup

1. **Visit your Coder URL**
2. **Create admin account** (first user becomes admin)
3. **Upload template** (already included in deployment)
4. **Create workspace** using "6fb-ai-agent-enhanced" template
5. **Start coding** from any device!

## 🛡️ Security Features

- **Built-in authentication** (username/password)
- **HTTPS encryption** (automatic SSL certificates)
- **Isolated workspaces** (Docker containers)
- **No exposed Docker daemon** (secure workspace provisioning)

## 💰 Cost Comparison

| Provider | Monthly Cost | Setup Difficulty | Features |
|----------|-------------|------------------|----------|
| Railway | $5-10 | ⭐ Easy | Auto-deploy, custom domains |
| DigitalOcean | $12+ | ⭐⭐ Medium | Managed platform, reliable |
| AWS/GCP | $10-50 | ⭐⭐⭐ Hard | Full control, enterprise features |

## 🔄 Scaling & Updates

- **Auto-scaling**: Railway automatically handles traffic
- **Updates**: Push code changes to auto-deploy
- **Backups**: Database automatically backed up
- **Monitoring**: Built-in logs and metrics

## 🆘 Troubleshooting

### Common Issues:
1. **"Service starting..."** - Wait 2-3 minutes for full startup
2. **"Connection refused"** - Check deployment logs
3. **"Template not found"** - Template auto-uploaded, may need manual upload

### Getting Help:
- Check deployment logs in your cloud provider dashboard
- Visit Coder docs: https://coder.com/docs
- GitHub issues: https://github.com/coder/coder

## 🎯 Next Steps

After successful deployment:
1. **Test from multiple devices** - Phone, tablet, different computers
2. **Customize templates** - Add more languages, tools, frameworks
3. **Team access** - Invite team members to shared Coder instance
4. **Advanced features** - SSO, custom domains, enterprise features