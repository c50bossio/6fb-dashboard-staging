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
    echo "# 6FB AI Agent System" > README.md
    
    # Create a simple package.json for the project
    cat > package.json << 'EOF'
{
  "name": "6fb-ai-agent-system",
  "version": "1.0.0",
  "description": "6FB AI Agent System",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.0"
  }
}
EOF
    
    # Create a simple Express server
    cat > index.js << 'EOF'
const express = require('express');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ message: '6FB AI Agent System is running!' });
});

app.listen(port, () => {
  console.log('Server running on port ' + port);
});
EOF
    
    # Install Node.js dependencies
    npm install
    
    # Set up Python virtual environment
    python3 -m venv venv
    source venv/bin/activate
    
    # Install common Python packages for AI development
    pip install fastapi uvicorn sqlalchemy requests python-dotenv pydantic
    
    # Create a simple FastAPI server
    cat > main.py << 'EOF'
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

app = FastAPI(title="6FB AI Agent System API")

class Message(BaseModel):
    content: str

@app.get("/")
async def root():
    return {"message": "6FB AI Agent System API is running!"}

@app.post("/chat")
async def chat(message: Message):
    return {"response": f"You said: {message.content}"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
EOF
    
    # Configure code-server
    mkdir -p ~/.config/code-server
    cat > ~/.config/code-server/config.yaml << 'EOF'
bind-addr: 0.0.0.0:8080
auth: none
cert: false
EOF
    
    # Install useful VS Code extensions for the project
    code-server --install-extension ms-python.python
    code-server --install-extension ms-vscode.vscode-typescript-next
    code-server --install-extension esbenp.prettier-vscode
    code-server --install-extension bradlc.vscode-tailwindcss
    code-server --install-extension ms-vscode.vscode-json
    
    # Start code-server in the background
    nohup code-server --bind-addr 0.0.0.0:8080 --auth none /home/coder/6fb-ai-agent > /tmp/code-server.log 2>&1 &
    
    echo "🎉 Development environment ready!"
    echo "📝 VS Code Server: http://localhost:8080"
    echo "🚀 Node.js Server: npm run dev (port 3000)"
    echo "🐍 Python API: python main.py (port 8000)"
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
  display_name = "Frontend (Node.js)"
  url          = "http://localhost:3000"
  icon         = "/icon/nodejs.svg"
  subdomain    = false
  share        = "owner"

  healthcheck {
    url       = "http://localhost:3000"
    interval  = 10
    threshold = 3
  }
}

# Backend API Server
resource "coder_app" "backend" {
  agent_id     = coder_agent.main.id
  slug         = "backend"
  display_name = "Backend API (FastAPI)"
  url          = "http://localhost:8000"
  icon         = "/icon/python.svg"
  subdomain    = false
  share        = "owner"

  healthcheck {
    url       = "http://localhost:8000"
    interval  = 10
    threshold = 3
  }
}

# Docker container workspace
resource "docker_container" "workspace" {
  count = data.coder_workspace.me.start_count
  image = "codercom/enterprise-base:ubuntu"
  name  = "coder-${data.coder_workspace.me.name}"
  
  env = ["CODER_AGENT_TOKEN=${coder_agent.main.token}"]
  
  # Expose ports for development servers
  ports {
    internal = 8080  # VS Code Server
    external = 8080
  }
  
  ports {
    internal = 3000  # Node.js Frontend
    external = 3000
  }
  
  ports {
    internal = 8000  # Python Backend
    external = 8000
  }
  
  entrypoint = ["sh", "-c", coder_agent.main.init_script]
}