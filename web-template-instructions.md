# 🚀 Create Template via Web Interface

Since CLI is having Terraform provider issues, let's create the template directly in your browser:

## Step-by-Step Instructions:

### 1. Go to Templates Tab
- In your Coder browser tab (http://143.244.173.119)
- Click "Templates" at the top

### 2. Create New Template
- Click "Create Template" or "Create one now"
- Fill in:
  - **Name**: `6fb-ai-agent`
  - **Display Name**: `6FB AI Agent System`
  - **Description**: `Development environment with VS Code, Node.js, and Python`

### 3. Paste This Terraform Code:

```hcl
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

provider "docker" {}
provider "coder" {}

data "coder_workspace" "me" {}

resource "coder_agent" "main" {
  arch = "amd64"
  os   = "linux"
  startup_script = <<-EOT
    #!/bin/bash
    set -e
    
    # Update and install tools
    sudo apt-get update
    sudo apt-get install -y curl wget git nodejs npm python3 python3-pip
    
    # Install code-server
    curl -fsSL https://code-server.dev/install.sh | sh
    
    # Create project
    mkdir -p ~/6fb-ai-agent
    cd ~/6fb-ai-agent
    echo "# 6FB AI Agent System" > README.md
    
    # Start code-server
    nohup code-server --bind-addr 0.0.0.0:8080 --auth none ~/6fb-ai-agent > ~/code-server.log 2>&1 &
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
}

resource "docker_container" "workspace" {
  count = data.coder_workspace.me.start_count
  image = "codercom/enterprise-base:ubuntu"
  name  = "coder-${data.coder_workspace.me.name}"
  env   = ["CODER_AGENT_TOKEN=${coder_agent.main.token}"]
  entrypoint = ["sh", "-c", coder_agent.main.init_script]
}
```

### 4. Save Template
- Click "Create Template" or "Save"
- Wait for validation to complete

### 5. Create Workspace
- Go back to "Workspaces" tab
- Click "New workspace"
- Select your "6fb-ai-agent" template
- Create workspace!

## What You'll Get:
- ✅ VS Code in browser
- ✅ Node.js + Python environment
- ✅ 6FB AI Agent project setup
- ✅ Remote coding from any device

The web interface handles all the Terraform provider setup automatically!