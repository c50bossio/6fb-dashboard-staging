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
    
    # Update system and install basic tools
    sudo apt-get update
    sudo apt-get install -y curl wget git vim nano
    
    # Install Node.js
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Install Python
    sudo apt-get install -y python3 python3-pip python3-venv
    
    # Install code-server
    curl -fsSL https://code-server.dev/install.sh | sh
    
    # Create project directory
    mkdir -p ~/6fb-ai-agent
    cd ~/6fb-ai-agent
    
    # Create basic project structure
    echo "# 6FB AI Agent System" > README.md
    echo "console.log('6FB AI Agent System');" > app.js
    
    # Start code-server
    nohup code-server --bind-addr 0.0.0.0:8080 --auth none ~/6fb-ai-agent > ~/code-server.log 2>&1 &
    
    echo "Development environment ready!"
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

resource "docker_container" "workspace" {
  count = data.coder_workspace.me.start_count
  image = "codercom/enterprise-base:ubuntu"
  name  = "coder-${data.coder_workspace.me.name}"
  
  env = ["CODER_AGENT_TOKEN=${coder_agent.main.token}"]
  
  ports {
    internal = 8080
    external = 8080
  }
  
  entrypoint = ["sh", "-c", coder_agent.main.init_script]
}