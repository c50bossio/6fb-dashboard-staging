# 6FB AI Agent System - Coder Template

This Coder template creates a fully configured development environment for the 6FB AI Agent System project.

## Features

### Development Stack
- **Node.js 18** - Latest LTS for frontend development
- **Python 3** with pip and venv - Backend development
- **SQLite** - Database for development
- **Docker & Docker Compose** - Container management

### Pre-installed Tools
- **VS Code Server** - Browser-based VS Code at `http://localhost:8080`
- **Git** - Version control with automatic user configuration
- **Common CLI tools** - curl, wget, vim, tree, htop

### Python Packages
- FastAPI & Uvicorn - Backend API framework
- SQLAlchemy - Database ORM
- OpenAI & Anthropic - AI service clients
- pytest, black, flake8 - Testing and code quality

### Node.js Packages
- TypeScript & ts-node - TypeScript development
- nodemon - Hot reload for development

### VS Code Extensions
- Python support
- TypeScript support
- Tailwind CSS support
- Prettier code formatting
- JSON support

## Workspace Applications

The template creates three applications accessible from your Coder dashboard:

1. **VS Code** (`http://localhost:8080`) - Full VS Code editor in browser
2. **Frontend** (`http://localhost:3000`) - Next.js development server
3. **Backend API** (`http://localhost:8001`) - FastAPI server with docs

## Getting Started

1. **Create workspace** from this template in Coder
2. **Open VS Code** from the workspace dashboard
3. **Navigate to your project** - The 6FB AI Agent System should be cloned automatically
4. **Start development servers**:
   ```bash
   # Terminal 1: Start frontend
   npm run dev
   
   # Terminal 2: Start backend
   source venv/bin/activate
   python fastapi-server.py
   ```

## Resource Configuration

- **CPU**: 2-8 cores (configurable)
- **Memory**: 4-12 GB (configurable)
- **Storage**: Persistent home directory volume

## Customization

To modify this template:
1. Edit `main.tf` for infrastructure changes
2. Edit `build/Dockerfile` for container changes
3. Run `coder template push` to update

## Troubleshooting

- **Port conflicts**: Check that ports 3000, 8001, and 8080 are available
- **Permission issues**: Ensure Docker has proper permissions
- **Git setup**: User name and email are automatically configured from Coder