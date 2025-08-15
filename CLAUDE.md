# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference (Context Optimized)

**📖 For essential development info**: See [`CLAUDE-CORE.md`](./CLAUDE-CORE.md)  
**⚡ For development workflows**: See [`CLAUDE-WORKFLOWS.md`](./CLAUDE-WORKFLOWS.md)  
**🔧 For detailed commands & troubleshooting**: See [`CLAUDE-REFERENCE.md`](./CLAUDE-REFERENCE.md)  
**📚 For complete documentation index**: See [`docs/INDEX.md`](./docs/INDEX.md)

## Context Window Optimized Summary

**Enterprise barbershop platform**: Next.js 14 + FastAPI + Supabase PostgreSQL.

### Core Rules
1. **NO MOCK DATA** - Always use real Supabase database
2. **FULL-STACK ONLY** - Complete features: DB schema → API → UI → tests  
3. **MEMORY CRITICAL** - FastAPI has memory-managed OAuth system

### Essential Commands
```bash
./docker-dev-start.sh     # Start everything
npm run claude:health     # Test all connections
npm run test:all         # Full test suite before commits
npm run lint && npm run build  # Verify code quality
```

### Key Files
- `lib/supabase-query.js` - Database operations
- `services/memory_manager.py` - Critical OAuth management
- `routers/` - FastAPI feature modules
- `components/ui/` - Base UI components

### Environment (Required)
```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

---
**Production system**: Test all changes, no shortcuts, real data only.

> **Context Window Optimization**: This file has been optimized for Claude Code efficiency. See modular files above for complete details when needed.