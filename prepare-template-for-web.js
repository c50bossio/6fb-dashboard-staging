#!/usr/bin/env node

/**
 * Prepare Template for Web Interface Upload
 * Creates the template content and provides copy-paste instructions
 */

const fs = require('fs');
const path = require('path');

const templateContent = `terraform {
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
  name  = "coder-\${data.coder_workspace.me.name}"
  
  env = ["CODER_AGENT_TOKEN=\${coder_agent.main.token}"]
  
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
}`;

console.log('🚀 6FB AI Agent Template Ready for Web Upload');
console.log('============================================');
console.log('');
console.log('✅ Template content generated successfully!');
console.log('');
console.log('📋 INSTRUCTIONS:');
console.log('1. Go to: http://143.244.173.119/templates');
console.log('2. Click "Create Template"');
console.log('3. Fill in:');
console.log('   - Name: 6fb-ai-agent');
console.log('   - Display Name: 6FB AI Agent System');
console.log('   - Description: Development environment with VS Code, Node.js, and Python');
console.log('');
console.log('4. Copy the template content below and paste it into the template editor:');
console.log('');
console.log('═══════════════ TEMPLATE CONTENT (COPY BELOW) ═══════════════');
console.log(templateContent);
console.log('═══════════════ END TEMPLATE CONTENT ═══════════════');
console.log('');
console.log('5. Click "Create Template"');
console.log('6. Wait for template validation (2-3 minutes)');
console.log('7. Create workspace from your new template!');
console.log('');
console.log('🎯 Your workspace will include:');
console.log('   • VS Code Server (browser-based)');
console.log('   • Node.js + Python development environment');
console.log('   • FastAPI backend setup');
console.log('   • 6FB AI Agent project structure');
console.log('   • Multiple app endpoints ready to use');

// Also save to file for easy access
fs.writeFileSync(path.join(__dirname, 'template-content.tf'), templateContent);
console.log('');
console.log('📁 Template also saved to: template-content.tf');
console.log('   (You can also copy from this file if needed)');