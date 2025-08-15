# CLAUDE.md - BookedBarber AI System

Enterprise barbershop platform: Next.js 14 (port 9999) + FastAPI (port 8001) + Supabase PostgreSQL.

## 🚨 Core Rules
1. **NO MOCK DATA** - Always use real Supabase database
2. **FULL-STACK ONLY** - Complete features: DB schema → API → UI → tests
3. **TEST FIRST** - `node test-supabase-access.js` before development

## Quick Start
```bash
./docker-dev-start.sh              # Start dev environment
node test-supabase-access.js       # Test DB connection
npm run health                     # API health check
docker compose down                # Stop everything
```

## Essential Commands
```bash
npm run test:all                # Full test suite
npm run cleanup-test-data       # Clean test data
docker compose logs -f frontend # View logs
curl http://localhost:9999/api/health # Health check
./scripts/context-cleanup.sh    # Optimize context for longer conversations
```

## Key Files
- `fastapi_backend.py` - Main backend server
- `app/layout.js` - Root layout with providers
- `middleware.js` - Security & route protection
- `lib/supabase-query.js` - Database operations
- `lib/ai-orchestrator-enhanced.js` - AI model routing

## Required Env Vars
```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
PUSHER_APP_ID=
```

## Development Checklist
- [ ] Database schema with RLS policies
- [ ] Backend API endpoint 
- [ ] Frontend UI with error handling
- [ ] Tests written and passing
- [ ] Real data (no mocks)

## 🚀 Context Optimization

### Be Specific (Use exact file paths)
```bash
# ❌ "analyze the codebase"
# ✅ "check /app/api/auth/callback/route.js for OAuth issues"

# ❌ "review all components"  
# ✅ "examine /components/dashboard/UnifiedDashboard.js"
```

### Session Focus (Pick ONE per conversation)
1. **Frontend**: Next.js components, pages, UI
2. **Backend**: FastAPI endpoints, AI services  
3. **Database**: Supabase schemas, queries
4. **Authentication**: OAuth, sessions, middleware
5. **Deployment**: Docker, Vercel, production

### Context Window Extension Strategies

#### 1. Git Context Management
```bash
# Clean git status (reduces context by 80%)
git add . && git commit -m "WIP: checkpoint"

# Remove large generated files from git tracking
echo "*.log" >> .gitignore
echo "node_modules/" >> .gitignore
echo ".next/" >> .gitignore
echo "dist/" >> .gitignore
```

#### 2. Use Focused Tool Commands
```bash
# ❌ Large context consumers
Read /app/                    # Reads entire directory
Glob **/*.js                  # Returns too many files

# ✅ Context efficient
Read /app/api/auth/route.js   # Single specific file
Grep "useState" --glob="*.js" # Targeted search
LS /app/components            # Directory listing only
```

#### 3. Break Large Tasks into Sessions
```bash
# Session 1: Database schema design
# Session 2: API implementation  
# Session 3: Frontend components
# Session 4: Testing & deployment
```

#### 4. Context Checkpoints
```bash
# Before context gets full, summarize progress:
# "Create a summary of changes made so far"
# Then start fresh session with summary
```

#### 5. Selective File Reading
```bash
# Read only specific sections
Read file.js --offset=100 --limit=50  # Lines 100-150
Grep "function.*auth" file.js         # Only auth functions
```

### Advanced Context Optimization

#### 6. Agent Specialization
```bash
# Use specialized agents for complex tasks
# Instead of one long conversation, use focused agents:
Task --subagent_type="frontend-specialist" "Fix React component"
Task --subagent_type="database-administrator" "Optimize queries"
Task --subagent_type="security-specialist" "Review auth flow"
```

#### 7. Context-Aware Commands
```bash
# Minimize repeated information
# ❌ "Read the file again to check the auth function"
# ✅ "Check the auth function we discussed in line 45"

# ❌ Repeat full file paths
# ✅ Use relative references: "the callback route", "main component"
```

#### 8. Efficient Error Handling
```bash
# When errors occur, be specific about what to check:
# ❌ "Something is wrong with the app"
# ✅ "Auth callback failing at line 23 in /app/api/auth/callback/route.js"
```

#### 9. Progressive Disclosure
```bash
# Start with high-level overview, drill down as needed:
# 1. "List main components" (gets structure)
# 2. "Show UserAuth component" (specific component)
# 3. "Focus on login method" (specific function)
```

#### 10. Context Cleanup Commands
```bash
# Before context fills up:
/clear                        # Clear conversation
git stash                     # Save work in progress
git checkout -b feature-name  # Create feature branch
```

### Context Budget Management
- **File reads**: ~500 tokens per small file
- **Directory listings**: ~50 tokens per 10 files  
- **Search results**: ~200 tokens per 10 results
- **Code generation**: ~300 tokens per function
- **Error traces**: ~400 tokens per stack trace

### Session Templates
```bash
# Quick Fix Session (5-10 exchanges)
"Fix specific bug in /path/to/file.js:line"

# Feature Development (15-20 exchanges)  
"Implement user authentication: DB → API → UI"

# Investigation Session (10-15 exchanges)
"Debug payment flow starting from checkout button"

# Optimization Session (8-12 exchanges)
"Improve performance of /api/users endpoint"
```

---
**Production system**: Test all changes, no shortcuts, real data only.