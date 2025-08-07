terraform {
  required_providers {
    coder = {
      source  = "coder/coder"
    }
    docker = {
      source  = "kreuzwerker/docker"
    }
  }
}

provider "docker" {
  host = "unix:///var/run/docker.sock"
}
provider "coder" {}

data "coder_workspace" "me" {}

resource "coder_agent" "main" {
  arch = "amd64"
  os   = "linux"
  startup_script = <<-EOT
    #!/bin/bash
    set -e
    
    # Update system and install tools
    sudo apt-get update
    sudo apt-get install -y curl wget git vim nano nodejs npm python3 python3-pip python3-venv
    
    # Install code-server
    curl -fsSL https://code-server.dev/install.sh | sh
    
    # Create 6FB AI Agent System project
    mkdir -p ~/6fb-ai-agent
    cd ~/6fb-ai-agent
    
    # Create project files
    echo "# 6FB AI Agent System - Ready!" > README.md
    echo "console.log('6FB AI Agent System - Ready!');" > app.js
    
    # Create Python virtual environment
    python3 -m venv venv
    source venv/bin/activate
    pip install fastapi uvicorn requests python-dotenv
    
    # Create basic FastAPI server
    cat > main.py << 'EOF'
from fastapi import FastAPI
app = FastAPI(title="6FB AI Agent API")

@app.get("/")
def read_root():
    return {"message": "6FB AI Agent System API is running!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
EOF
    
    # Configure code-server
    mkdir -p ~/.config/code-server
    cat > ~/.config/code-server/config.yaml << 'EOF'
bind-addr: 0.0.0.0:8080
auth: none
cert: false
EOF
    
    # Start code-server
    nohup code-server --bind-addr 0.0.0.0:8080 --auth none ~/6fb-ai-agent > ~/code-server.log 2>&1 &
    
    echo "🎉 6FB AI Agent System ready!"
  EOT
}

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

resource "coder_app" "frontend" {
  agent_id     = coder_agent.main.id
  slug         = "frontend"
  display_name = "Frontend"
  url          = "http://localhost:3000"
  icon         = "/icon/nodejs.svg"
  subdomain    = false
  share        = "owner"
}

resource "coder_app" "backend" {
  agent_id     = coder_agent.main.id
  slug         = "backend" 
  display_name = "Python API"
  url          = "http://localhost:8000"
  icon         = "/icon/python.svg"
  subdomain    = false
  share        = "owner"
}

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