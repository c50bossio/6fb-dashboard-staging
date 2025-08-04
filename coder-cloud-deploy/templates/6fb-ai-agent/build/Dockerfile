FROM codercom/enterprise-base:ubuntu

ARG USER=coder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    vim \
    tree \
    htop \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    nodejs \
    npm \
    sqlite3 \
    docker.io \
    docker-compose \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18 (latest LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Install global npm packages useful for development
RUN npm install -g nodemon typescript ts-node @types/node

# Install code-server for VS Code in browser
RUN curl -fsSL https://code-server.dev/install.sh | sh

# Install Python packages commonly used in AI development
RUN pip3 install --no-cache-dir \
    fastapi \
    uvicorn \
    sqlalchemy \
    sqlite3 \
    requests \
    python-dotenv \
    pydantic \
    openai \
    anthropic \
    pytest \
    black \
    flake8

# Set up user
USER $USER

# Set working directory
WORKDIR /home/$USER

# Create common project directories
RUN mkdir -p /home/$USER/projects /home/$USER/.config

# Configure git (will be overridden by Coder agent env vars)
RUN git config --global init.defaultBranch main
RUN git config --global pull.rebase false

# Set up code-server config
RUN mkdir -p /home/$USER/.config/code-server
RUN echo "bind-addr: 0.0.0.0:8080" > /home/$USER/.config/code-server/config.yaml
RUN echo "auth: none" >> /home/$USER/.config/code-server/config.yaml
RUN echo "cert: false" >> /home/$USER/.config/code-server/config.yaml

# Install useful VS Code extensions
RUN code-server --install-extension ms-python.python
RUN code-server --install-extension ms-vscode.vscode-typescript-next
RUN code-server --install-extension bradlc.vscode-tailwindcss
RUN code-server --install-extension esbenp.prettier-vscode
RUN code-server --install-extension ms-vscode.vscode-json

# Create startup script for code-server
RUN echo '#!/bin/bash\ncode-server --bind-addr 0.0.0.0:8080 --auth none' > /home/$USER/start-code-server.sh
RUN chmod +x /home/$USER/start-code-server.sh

# Expose ports
EXPOSE 8080 3000 8001

# Set default shell
SHELL ["/bin/bash", "-c"]

# Default command
CMD ["/bin/bash"]