# 🚀 Create 6FB AI Agent Template via Web Interface

Since the CLI requires a token, let's create the template directly in the web interface:

## Method 1: Web Interface Template Creation

1. **Click "Templates" tab** in your Coder interface
2. **Click "Create Template"** or "Create one now"
3. **Upload the template files** or paste the content

## Method 2: Use Our Template Content

Copy and paste this Terraform configuration into the web template editor:

```hcl
terraform {
  required_providers {
    coder = {
      source = "coder/coder"
    }
    docker = {
      source = "kreuzwerker/docker"
    }
  }
}

provider "docker" {}
provider "coder" {}

data "coder_workspace" "me" {}

resource "coder_agent" "main" {
  arch = "amd64"
  os   = "linux"
  startup_script = <<-EOT
    #!/bin/bash
    set -e
    
    # Install Node.js and Python for 6FB AI Agent System
    sudo apt-get update
    sudo apt-get install -y nodejs npm python3 python3-pip git curl wget
    
    # Install code-server
    curl -fsSL https://code-server.dev/install.sh | sh
    
    # Create project directory
    mkdir -p /home/coder/6fb-ai-agent
    cd /home/coder/6fb-ai-agent
    
    # Create starter files for 6FB AI Agent System
    echo "# 6FB AI Agent System" > README.md
    
    # Install Node.js dependencies
    npm init -y
    npm install express dotenv fastify
    
    # Set up Python virtual environment
    python3 -m venv venv
    source venv/bin/activate
    pip install fastapi uvicorn sqlalchemy requests python-dotenv pydantic
    
    # Configure code-server
    mkdir -p ~/.config/code-server
    cat > ~/.config/code-server/config.yaml << 'EOF'
bind-addr: 0.0.0.0:8080
auth: none
cert: false
EOF
    
    # Start code-server
    nohup code-server --bind-addr 0.0.0.0:8080 --auth none /home/coder/6fb-ai-agent > /tmp/code-server.log 2>&1 &
    
    echo "🎉 6FB AI Agent development environment ready!"
  EOT
}

# VS Code Server App
resource "coder_app" "code-server" {
  agent_id     = coder_agent.main.id
  slug         = "code-server"
  display_name = "VS Code"
  url          = "http://localhost:8080"
  icon         = "/icon/code.svg"
  subdomain    = false
  share        = "owner"

  healthcheck {
    url       = "http://localhost:8080/healthz"
    interval  = 5
    threshold = 6
  }
}

# Frontend Development Server
resource "coder_app" "frontend" {
  agent_id     = coder_agent.main.id
  slug         = "frontend"
  display_name = "Frontend"
  url          = "http://localhost:3000"
  icon         = "/icon/nodejs.svg"
  subdomain    = false
  share        = "owner"
}

# Backend API Server
resource "coder_app" "backend" {
  agent_id     = coder_agent.main.id
  slug         = "backend"
  display_name = "Backend API"
  url          = "http://localhost:8000"
  icon         = "/icon/python.svg"
  subdomain    = false
  share        = "owner"
}

# Docker container workspace
resource "docker_container" "workspace" {
  count = data.coder_workspace.me.start_count
  image = "codercom/enterprise-base:ubuntu"
  name  = "coder-${data.coder_workspace.me.name}"
  
  env = ["CODER_AGENT_TOKEN=${coder_agent.main.token}"]
  
  ports {
    internal = 8080
    external = 8080
  }
  
  ports {
    internal = 3000
    external = 3000
  }
  
  ports {
    internal = 8000
    external = 8000
  }
  
  entrypoint = ["sh", "-c", coder_agent.main.init_script]
}
```

## Template Settings:
- **Name**: `6fb-ai-agent`
- **Display Name**: `6FB AI Agent System`
- **Description**: `Development environment for 6FB AI Agent System with VS Code, Node.js, and Python`
- **Icon**: Choose a development or AI icon

## After Creating Template:
1. **Create a workspace** from the new template
2. **Wait for provisioning** (2-3 minutes)
3. **Access VS Code** through the workspace apps
4. **Start developing** your 6FB AI Agent System!