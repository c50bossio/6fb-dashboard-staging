#!/usr/bin/env node

/**
 * Automated Coder Template Setup Script
 * This script automates the creation of Coder templates and workspaces
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class CoderAutomation {
  constructor() {
    this.coderUrl = 'http://143.244.173.119';
    this.templateName = '6fb-ai-agent';
  }

  log(message) {
    console.log(`🤖 [Coder Automation] ${message}`);
  }

  error(message) {
    console.error(`❌ [Coder Automation] ${message}`);
  }

  success(message) {
    console.log(`✅ [Coder Automation] ${message}`);
  }

  // Check if Coder CLI is authenticated
  async checkAuth() {
    try {
      execSync('coder list', { stdio: 'pipe' });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Authenticate with Coder
  async authenticate() {
    this.log('Checking Coder authentication...');
    
    if (await this.checkAuth()) {
      this.success('Already authenticated with Coder');
      return true;
    }

    this.log('Please authenticate with Coder CLI:');
    console.log(`1. Visit: ${this.coderUrl}/cli-auth`);
    console.log(`2. Copy the token`);
    console.log(`3. Run: echo "YOUR_TOKEN" | coder login ${this.coderUrl}`);
    console.log(`4. Then run this script again`);
    
    return false;
  }

  // Create the template directory and files
  createTemplateFiles() {
    this.log('Creating template files...');
    
    const templateDir = path.join(__dirname, 'automated-template');
    
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir);
    }

    const terraformConfig = `terraform {
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
    echo "# 6FB AI Agent System - Automated Setup" > README.md
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
    return {"status": "healthy", "automated": true}
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
    
    echo "🎉 6FB AI Agent System ready! (Automated)"
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

    fs.writeFileSync(path.join(templateDir, 'main.tf'), terraformConfig);
    
    this.success('Template files created');
    return templateDir;
  }

  // Upload template to Coder
  async uploadTemplate() {
    this.log('Uploading template to Coder...');
    
    const templateDir = this.createTemplateFiles();
    
    try {
      process.chdir(templateDir);
      
      // Initialize Terraform
      this.log('Initializing Terraform...');
      execSync('terraform init', { stdio: 'inherit' });
      
      // Validate Terraform configuration
      this.log('Validating Terraform configuration...');
      execSync('terraform validate', { stdio: 'inherit' });
      
      // Push template to Coder
      this.log('Pushing template to Coder...');
      execSync(`coder templates push ${this.templateName} --yes`, { stdio: 'inherit' });
      this.success('Template uploaded successfully!');
      return true;
    } catch (error) {
      this.error(`Template upload failed: ${error.message}`);
      return false;
    }
  }

  // Create workspace from template
  async createWorkspace(workspaceName = 'my-6fb-workspace') {
    this.log(`Creating workspace: ${workspaceName}`);
    
    try {
      execSync(`coder create ${workspaceName} --template ${this.templateName} --yes`, { stdio: 'inherit' });
      this.success(`Workspace "${workspaceName}" created successfully!`);
      return true;
    } catch (error) {
      this.error(`Workspace creation failed: ${error.message}`);
      return false;
    }
  }

  // Main automation workflow
  async run() {
    console.log('🚀 Starting Coder Setup Automation');
    console.log('==================================');
    
    // Check authentication
    if (!(await this.authenticate())) {
      return;
    }

    // Upload template
    if (!(await this.uploadTemplate())) {
      return;
    }

    // Ask if user wants to create a workspace
    console.log('\\n📋 Template uploaded successfully!');
    console.log(`Visit: ${this.coderUrl}/templates to see your template`);
    console.log('\\n🚀 To create a workspace, run:');
    console.log(`node automate-coder-setup.js --create-workspace [workspace-name]`);
  }
}

// CLI handling
const automation = new CoderAutomation();

if (process.argv.includes('--create-workspace')) {
  const workspaceIndex = process.argv.indexOf('--create-workspace');
  const workspaceName = process.argv[workspaceIndex + 1] || 'my-6fb-workspace';
  automation.createWorkspace(workspaceName);
} else {
  automation.run();
}