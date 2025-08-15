# Documentation Index

**Context Window Optimized Documentation System**

## Quick Start (Claude Code Optimized)
- [`CLAUDE.md`](../CLAUDE.md) - Context-optimized main guide ⚡
- [`CLAUDE-CORE.md`](../CLAUDE-CORE.md) - Essential rules & commands
- [`CLAUDE-WORKFLOWS.md`](../CLAUDE-WORKFLOWS.md) - Development processes  
- [`CLAUDE-REFERENCE.md`](../CLAUDE-REFERENCE.md) - Complete command reference

## Project Documentation

### Core Implementation Guides
- [`prd.md`](./prd.md) - Product Requirements Document
- [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) - Production deployment guide

### Integration & Technical Docs
- [`CIN7_INTEGRATION.md`](./CIN7_INTEGRATION.md) - CIN7 inventory integration
- [`CIN7_INTEGRATION_IMPROVEMENTS.md`](./CIN7_INTEGRATION_IMPROVEMENTS.md) - CIN7 enhancements

### Summary Documents
- [`AI_ENHANCEMENT_SUMMARY.md`](../AI_ENHANCEMENT_SUMMARY.md) - AI system improvements
- [`TESTING_SUMMARY.md`](../TESTING_SUMMARY.md) - Testing strategy overview

## Component Documentation

### Architecture
```
📁 Main Application
├── app/              # Next.js pages & API routes
├── components/       # React components (190+ files)
├── lib/             # Utility libraries & database queries  
├── services/        # Backend services (Python FastAPI)
└── routers/         # API route handlers

📁 Infrastructure  
├── database/        # SQL schemas & migrations
├── scripts/         # Automation & setup scripts
├── tests/          # Test suites (Jest + Playwright)
└── monitoring/     # Observability & metrics
```

### Component Categories

**Core UI** (`components/ui/`)
- Base components: Button, Input, Modal, etc.
- Design system components
- Accessibility providers

**Feature Components** (`components/`)
- `ai/` - AI chat and orchestration
- `calendar/` - Booking and scheduling
- `dashboard/` - Analytics and insights
- `billing/` - Payment and subscription
- `auth/` - Authentication flows

**Page Components** (`app/`)
- Dashboard pages
- Public pages
- API routes
- Protected routes

## Development Resources

### Scripts & Automation
- [`scripts/`](../scripts/) - Setup, deployment, and maintenance scripts
- [`database/`](../database/) - Database schemas and migrations
- [`monitoring/`](../monitoring/) - System monitoring configuration

### Testing
- [`__tests__/`](../__tests__/) - Unit and integration tests  
- [`tests/`](../tests/) - End-to-end test suites
- [`evaluations/`](../evaluations/) - AI agent performance evaluation

### Configuration
- [`package.json`](../package.json) - Dependencies and scripts
- [`docker-compose.yml`](../docker-compose.yml) - Development environment
- [`next.config.js`](../next.config.js) - Next.js configuration

## Usage Patterns

### When to Use Which Doc
- **Quick context** → `CLAUDE.md` (45 lines)
- **Development rules** → `CLAUDE-CORE.md` (50 lines)  
- **Workflow guidance** → `CLAUDE-WORKFLOWS.md` (60 lines)
- **Command reference** → `CLAUDE-REFERENCE.md` (complete)
- **Complete context** → This index + specific docs

### Context Window Strategy
1. Start with `CLAUDE.md` for all interactions
2. Reference specific modular docs only when needed
3. Use this index to find relevant documentation
4. Load detailed docs on-demand to preserve context space

---
**Updated**: Context window optimization system implemented  
**Maintained by**: Claude Code context optimization process