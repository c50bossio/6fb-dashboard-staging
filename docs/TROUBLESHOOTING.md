# Troubleshooting Guide - 6FB AI Agent System

## 🚨 Overview

This comprehensive troubleshooting guide covers common issues, solutions, and diagnostic procedures for the 6FB AI Agent System. The system includes multiple components that work together to provide enterprise-grade barbershop management with AI capabilities.

**System Components:**
- **Frontend**: Next.js 14 (Port 9999)
- **Backend**: FastAPI Python (Port 8001) 
- **Database**: Supabase PostgreSQL
- **AI Services**: OpenAI, Anthropic, Google
- **Real-time**: Pusher WebSocket
- **Containerization**: Docker Compose

## 🔍 Quick Diagnostics

### System Health Check
```bash
# Check system health
curl http://localhost:9999/api/health
curl http://localhost:8001/health

# Check Docker services
docker-compose ps

# Check service logs
docker-compose logs --tail=50 frontend
docker-compose logs --tail=50 backend

# Check resource usage
docker stats --no-stream
```

### Common Quick Fixes
```bash
# Restart services
docker-compose restart

# Clear Docker cache
docker system prune -f

# Rebuild images
docker-compose build --no-cache

# Reset database
npm run setup-db

# Clear npm cache
npm run cache:clean
```

## 🖥️ Frontend Issues (Next.js)

### Issue: Frontend Won't Start

#### Symptoms
- `npm run dev` fails to start
- Port 9999 is not accessible
- Build errors during startup

#### Diagnostics
```bash
# Check Node.js version
node --version  # Should be 18+

# Check port availability
lsof -i :9999

# Check dependencies
npm ls

# Check environment variables
npm run check-env

# Verify build
npm run build
```

#### Solutions

**Port Conflict:**
```bash
# Kill process using port 9999
lsof -ti:9999 | xargs kill -9

# Use alternative port
npm run dev -- -p 3000
```

**Dependency Issues:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next
npm run build
```

**Environment Configuration:**
```bash
# Copy environment template
cp .env.example .env.local

# Check required variables
grep -E "NEXT_PUBLIC_|SUPABASE_" .env.local
```

### Issue: Build Failures

#### Symptoms
- TypeScript compilation errors
- Missing dependencies
- Asset optimization failures

#### Solutions

**TypeScript Errors:**
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Update TypeScript
npm update typescript

# Clear TypeScript cache
rm -rf .next/cache
```

**Memory Issues:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max_old_space_size=4096"
npm run build

# Use alternative build command
npm run build -- --experimental-debug-memory-usage
```

### Issue: Page Load Issues

#### Symptoms
- White screen of death
- JavaScript errors in console
- Slow page loads

#### Diagnostics
```bash
# Check browser console for errors
# Open Developer Tools → Console

# Check network requests
# Open Developer Tools → Network

# Check lighthouse performance
npx lighthouse http://localhost:9999 --only-categories=performance
```

#### Solutions

**JavaScript Errors:**
```bash
# Enable error reporting
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn npm run dev

# Check for hydration errors
# Look for "Text content does not match server-rendered HTML"

# Verify imports
npm run lint
```

**Performance Issues:**
```bash
# Enable bundle analyzer
ANALYZE=true npm run build

# Optimize images
# Check /public directory for large images

# Enable compression
# Add to next.config.js:
compress: true
```

## 🔧 Backend Issues (FastAPI)

### Issue: Backend Won't Start

#### Symptoms
- `python fastapi_backend.py` fails
- Port 8001 not responding
- Import errors

#### Diagnostics
```bash
# Check Python version
python --version  # Should be 3.9+

# Check dependencies
pip list | grep fastapi
pip list | grep uvicorn

# Test direct import
python -c "from fastapi_backend import app; print('Import successful')"

# Check port availability
lsof -i :8001
```

#### Solutions

**Python Dependencies:**
```bash
# Install requirements
pip install -r requirements.txt

# Update pip
pip install --upgrade pip

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

**Port Issues:**
```bash
# Kill process on port 8001
lsof -ti:8001 | xargs kill -9

# Use different port
uvicorn fastapi_backend:app --host 0.0.0.0 --port 8002
```

**Import Errors:**
```bash
# Set Python path
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Check for missing services
python -c "import services.ai_orchestrator_service"
```

### Issue: API Endpoints Returning 500 Errors

#### Symptoms
- Internal server errors on API calls
- Database connection errors
- AI service failures

#### Diagnostics
```bash
# Check backend logs
docker-compose logs backend | tail -100

# Test database connection
python -c "
import os
from supabase import create_client
client = create_client(os.getenv('NEXT_PUBLIC_SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))
print('Database connection successful')
"

# Test AI services
curl -X POST http://localhost:8001/ai/test \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

#### Solutions

**Database Issues:**
```bash
# Check Supabase connection
# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Test with curl
curl -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/profiles"
```

**AI Service Issues:**
```bash
# Check API keys
echo $OPENAI_API_KEY | cut -c1-10
echo $ANTHROPIC_API_KEY | cut -c1-10

# Test OpenAI directly
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "test"}],
    "max_tokens": 5
  }'
```

### Issue: Slow API Responses

#### Symptoms
- API calls taking >2 seconds
- Timeout errors
- High CPU usage

#### Solutions

**Database Optimization:**
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Add indexes
CREATE INDEX CONCURRENTLY idx_appointments_start_time ON appointments(start_time);
CREATE INDEX CONCURRENTLY idx_customers_email ON customers(email);
```

**Caching Implementation:**
```python
# Add Redis caching
import redis
redis_client = redis.Redis(host='localhost', port=6379, db=0)

# Cache frequently accessed data
@app.get("/api/services")
async def get_services():
    cached = redis_client.get("services")
    if cached:
        return json.loads(cached)
    
    services = fetch_services_from_db()
    redis_client.setex("services", 300, json.dumps(services))
    return services
```

## 🗄️ Database Issues

### Issue: Database Connection Failures

#### Symptoms
- "Connection refused" errors
- Timeout connecting to database
- Authentication failures

#### Diagnostics
```bash
# Test basic connectivity
pg_isready -h db.your-project.supabase.co -p 5432

# Test authentication
psql -h db.your-project.supabase.co -U postgres -d postgres

# Check connection pool
# Look for "too many clients" errors
```

#### Solutions

**Connection String Issues:**
```bash
# Verify connection string format
# postgresql://[user[:password]@][host][:port][/database]

# Check for special characters
echo "$DATABASE_URL" | grep -o '[^a-zA-Z0-9:/@.-]'

# URL encode special characters
python -c "import urllib.parse; print(urllib.parse.quote_plus('your-password'))"
```

**Connection Pool Exhaustion:**
```python
# Adjust connection pool settings in Supabase client
from supabase import create_client

supabase = create_client(
    supabase_url,
    supabase_key,
    options={
        'db': {
            'pool': {
                'min': 2,
                'max': 10,
                'timeout': 30
            }
        }
    }
)
```

### Issue: Row Level Security (RLS) Denials

#### Symptoms
- "Permission denied" on database operations
- Users can't see their own data
- 403 Forbidden responses

#### Solutions

**Check RLS Policies:**
```sql
-- View existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';

-- Test policy for specific user
SELECT * FROM appointments WHERE user_id = auth.uid();

-- Disable RLS temporarily for debugging (development only)
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
```

**Fix Common RLS Issues:**
```sql
-- Policy for user's own appointments
CREATE POLICY "Users can view own appointments" ON appointments
  FOR SELECT USING (auth.uid() = user_id);

-- Policy for barbers to see their appointments
CREATE POLICY "Barbers can view their appointments" ON appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM barbershop_staff 
      WHERE staff_id = auth.uid() 
      AND barber_id = appointments.barber_id
    )
  );
```

### Issue: Database Migration Failures

#### Symptoms
- Schema changes not applied
- Missing tables or columns
- Constraint violations

#### Solutions

**Check Migration Status:**
```bash
# Supabase migrations
npx supabase status

# Manual schema check
psql -h your-db -c "\d appointments"
```

**Fix Migration Issues:**
```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'appointments'
);

-- Add missing columns safely
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS recurring_pattern_id UUID;

-- Create missing indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS
idx_appointments_barber_date ON appointments(barber_id, start_time);
```

### 🚨 Issue: Empty Data Results (shop_id vs barbershop_id)

#### Symptoms
- Calendar shows no appointments despite data existing
- Services API returns empty array
- Customer list is empty
- Barber selection dropdown is empty
- Dashboard shows zero metrics

#### Root Cause
**CRITICAL**: Your code is querying the deprecated `shop_id` column instead of `barbershop_id`. This is a schema inconsistency issue from an incomplete 2025 migration.

**Data Distribution**:
- `customers` table: **52 rows** in `barbershop_id`, **0 rows** in `shop_id`
- `services` table: **17 rows** in `barbershop_id`, only 3 in `shop_id`
- `appointments`: 100% of data in `barbershop_id` column

#### Diagnostics

**Quick Check - Profile Table**:
```sql
-- Check if user profile has the right shop identifier
SELECT
  id,
  email,
  shop_id,           -- DEPRECATED - likely NULL or outdated
  barbershop_id,     -- CORRECT - should have UUID value
  role
FROM profiles
WHERE id = 'your-user-id';
```

**Expected Result**:
- `shop_id`: NULL or outdated UUID
- `barbershop_id`: Valid UUID (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

**Data Validation**:
```sql
-- Count data in both columns across critical tables
SELECT
  'customers' as table_name,
  COUNT(*) FILTER (WHERE shop_id IS NOT NULL) as shop_id_count,
  COUNT(*) FILTER (WHERE barbershop_id IS NOT NULL) as barbershop_id_count
FROM customers
UNION ALL
SELECT
  'services',
  COUNT(*) FILTER (WHERE shop_id IS NOT NULL),
  COUNT(*) FILTER (WHERE barbershop_id IS NOT NULL)
FROM services
UNION ALL
SELECT
  'appointments',
  COUNT(*) FILTER (WHERE barbershop_id IS NOT NULL),  -- appointments doesn't have shop_id
  COUNT(*) FILTER (WHERE barbershop_id IS NOT NULL)
FROM appointments;
```

**Check Code for Wrong Column**:
```bash
# Find files querying shop_id (WRONG)
grep -r "shop_id" app/ components/ lib/ | grep -v "node_modules"

# Find files with fallback logic (DANGEROUS)
grep -r "shop_id || barbershop_id" app/ components/ lib/

# Find correct usage (SHOULD BE MAJORITY)
grep -r "barbershop_id" app/ components/ lib/ | grep -v "node_modules"
```

#### Solutions

**Fix 1: Update Profile Query** ✅
```javascript
// ❌ WRONG - Returns NULL or outdated ID
const profile = await supabase
  .from('profiles')
  .select('shop_id')  // WRONG COLUMN!
  .eq('id', userId)
  .single();

const shopId = profile?.shop_id;  // NULL → no data returned

// ✅ CORRECT - Returns actual shop ID
const profile = await supabase
  .from('profiles')
  .select('barbershop_id')  // CORRECT COLUMN
  .eq('id', userId)
  .single();

const shopId = profile?.barbershop_id;  // Valid UUID → data loads
```

**Fix 2: Update API Queries** ✅
```javascript
// ❌ WRONG - Returns empty array
const { data: services } = await supabase
  .from('services')
  .select('*')
  .eq('shop_id', shopId);  // WRONG - shop_id is empty

// ✅ CORRECT - Returns all services
const { data: services } = await supabase
  .from('services')
  .select('*')
  .eq('barbershop_id', shopId);  // CORRECT - barbershop_id has data
```

**Fix 3: Remove Fallback Logic** ✅
```javascript
// ❌ DANGEROUS - Masks the real problem
const shopId = profile?.shop_id || profile?.barbershop_id;
// This causes inconsistent behavior and data loss

// ✅ CORRECT - Explicit and predictable
const shopId = profile?.barbershop_id;
if (!shopId) {
  console.error('User missing barbershop_id - check profile setup');
  return;
}
```

**Fix 4: Update Component Props** ✅
```javascript
// ❌ WRONG - Using old naming
<Calendar shopId={shopId} />
<ServiceList shopId={shopId} />

// ✅ CORRECT - Using standard naming
<Calendar barbershopId={barbershopId} />
<ServiceList barbershopId={barbershopId} />
```

#### Real-World Example: Calendar Page Bug

**Problem**: Calendar page showed no appointments

**Root Cause** (found in `app/(protected)/dashboard/calendar/page.js`):
```javascript
// Lines 50-58 - WRONG
const shopId = profile?.shop_id || profile?.barbershop_id;  // shop_id was NULL
```

**Fix**:
```javascript
// CORRECT
const shopId = profile?.barbershop_id;  // Always use barbershop_id
```

**Result**: Calendar immediately loaded all appointments

#### Prevention

**Always Use barbershop_id**:
1. All new code MUST use `barbershop_id`
2. Never query `shop_id` column
3. Never use fallback patterns like `shop_id || barbershop_id`
4. Update any existing code that references `shop_id`

**Code Review Checklist**:
- [ ] All database queries use `barbershop_id`
- [ ] No `shop_id` references in new code
- [ ] No fallback logic with `shop_id`
- [ ] Component props use `barbershopId` (camelCase)
- [ ] API endpoints filter by `barbershop_id`

**Migration Status**:
- ✅ **Phase 1**: Documentation created (`/docs/SCHEMA_STANDARDS.md`)
- ⏳ **Phase 2**: Data migration in progress
- ⏳ **Phase 3**: Code cleanup in progress
- ⏳ **Phase 4**: Drop `shop_id` columns (scheduled)

**Reference**: See `/docs/SCHEMA_STANDARDS.md` for complete field naming standards

## 🤖 AI Service Issues

### Issue: AI Services Not Responding

#### Symptoms
- AI chat returns generic responses
- API key errors
- Service timeout errors

#### Diagnostics
```bash
# Test AI service endpoints
curl -X POST http://localhost:8001/ai/health
curl -X POST http://localhost:8001/ai/chat -d '{"message": "test"}'

# Check AI service logs
docker-compose logs backend | grep -i "ai\|openai\|anthropic"

# Verify API keys
python -c "
import os
print('OpenAI Key:', os.getenv('OPENAI_API_KEY', 'NOT SET')[:10] + '...')
print('Anthropic Key:', os.getenv('ANTHROPIC_API_KEY', 'NOT SET')[:10] + '...')
"
```

#### Solutions

**API Key Issues:**
```bash
# Check key format
# OpenAI keys start with 'sk-'
# Anthropic keys start with 'sk-ant-'

# Test keys directly
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models

# Regenerate keys if needed
# Visit OpenAI/Anthropic dashboard
```

**Service Fallbacks:**
```python
# Implement graceful fallbacks
async def get_ai_response(message: str):
    try:
        return await openai_service.chat(message)
    except Exception as e:
        logger.warning(f"OpenAI failed: {e}")
        try:
            return await anthropic_service.chat(message)
        except Exception as e:
            logger.warning(f"Anthropic failed: {e}")
            return generate_fallback_response(message)
```

### Issue: Vector Database Problems

#### Symptoms
- RAG system not finding relevant context
- ChromaDB connection errors
- Embedding generation failures

#### Solutions

**ChromaDB Issues:**
```python
# Check ChromaDB connection
import chromadb
client = chromadb.PersistentClient(path="./chroma_db")
collections = client.list_collections()
print(f"Collections: {len(collections)}")

# Reset ChromaDB if corrupted
import shutil
shutil.rmtree("./chroma_db", ignore_errors=True)
# Then reinitialize
```

**Embedding Issues:**
```python
# Test embedding generation
import openai
response = openai.Embedding.create(
    model="text-embedding-ada-002",
    input="test text"
)
print(f"Embedding dimensions: {len(response['data'][0]['embedding'])}")
```

## 🔄 Real-Time Issues (Pusher/WebSocket)

### Issue: Real-Time Updates Not Working

#### Symptoms
- Dashboard not updating automatically
- WebSocket connection failures
- Missing real-time notifications

#### Diagnostics
```bash
# Check Pusher configuration
echo "App ID: $PUSHER_APP_ID"
echo "Key: $NEXT_PUBLIC_PUSHER_KEY"
echo "Cluster: $NEXT_PUBLIC_PUSHER_CLUSTER"

# Test WebSocket connection in browser console
# new WebSocket('wss://ws-us2.pusher.com')
```

#### Solutions

**Pusher Configuration:**
```javascript
// Check Pusher connection in browser
import Pusher from 'pusher-js'

const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  encrypted: true
})

pusher.connection.bind('connected', () => {
  console.log('Pusher connected')
})

pusher.connection.bind('error', (error) => {
  console.error('Pusher error:', error)
})
```

**Fallback to Polling:**
```javascript
// Implement polling fallback
const [usePolling, setUsePolling] = useState(false)

useEffect(() => {
  if (usePolling) {
    const interval = setInterval(() => {
      fetchLatestData()
    }, 5000)
    return () => clearInterval(interval)
  }
}, [usePolling])

// Switch to polling if WebSocket fails
pusher.connection.bind('error', () => {
  setUsePolling(true)
})
```

## 🐳 Docker Issues

### Issue: Docker Services Won't Start

#### Symptoms
- `docker-compose up` fails
- Services constantly restarting
- Resource exhaustion errors

#### Diagnostics
```bash
# Check Docker daemon
systemctl status docker

# Check available resources
df -h
free -h

# Check Docker logs
docker-compose logs --tail=100

# Check service health
docker-compose ps
```

#### Solutions

**Resource Issues:**
```bash
# Increase Docker resources
# Docker Desktop → Settings → Resources
# Memory: 4GB minimum, 8GB recommended
# Disk: 20GB minimum

# Clean up Docker resources
docker system prune -a -f --volumes

# Remove unused containers
docker container prune -f
```

**Port Conflicts:**
```bash
# Check port usage
netstat -tulpn | grep -E "(9999|8001|5432|6379)"

# Change ports in docker-compose.yml
services:
  frontend:
    ports:
      - "3000:3000"  # Instead of 9999:9999
```

**Volume Issues:**
```bash
# Check volume mounts
docker volume ls
docker volume inspect project_postgres_data

# Reset volumes if corrupted
docker-compose down -v
docker volume prune -f
docker-compose up -d
```

### Issue: Image Build Failures

#### Symptoms
- Docker build process fails
- "No space left on device" errors
- Dependency installation failures

#### Solutions

**Build Context Issues:**
```dockerfile
# Add .dockerignore to reduce build context
node_modules
.next
.git
*.log
coverage/
```

**Multi-stage Build Optimization:**
```dockerfile
# Frontend Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
COPY --from=builder /app/.next ./
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔐 Authentication & Authorization Issues

### Issue: Login Failures

#### Symptoms
- Users can't log in
- Session expires immediately
- Incorrect user roles

#### Diagnostics
```bash
# Test authentication endpoint
curl -X POST http://localhost:9999/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'

# Check Supabase auth logs
# Visit Supabase Dashboard → Authentication → Logs
```

#### Solutions

**JWT Token Issues:**
```javascript
// Check token in browser storage
localStorage.getItem('supabase.auth.token')

// Verify token structure
const token = 'your-jwt-token'
const payload = JSON.parse(atob(token.split('.')[1]))
console.log('Token expires:', new Date(payload.exp * 1000))
```

**Role-Based Access:**
```sql
-- Check user roles
SELECT id, email, role, created_at FROM auth.users;

-- Update user role
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'), 
  '{role}', 
  '"SHOP_OWNER"'
) 
WHERE email = 'user@example.com';
```

## 📱 Mobile & Responsive Issues

### Issue: Mobile Layout Problems

#### Symptoms
- Calendar not responsive on mobile
- Buttons too small on touch devices
- Horizontal scrolling

#### Solutions

**Calendar Mobile Optimization:**
```javascript
// FullCalendar mobile configuration
const calendarOptions = {
  headerToolbar: {
    left: 'prev,next',
    center: 'title',
    right: 'dayGridMonth,listWeek'
  },
  height: 'auto',
  contentHeight: 600,
  aspectRatio: window.innerWidth < 768 ? 1.2 : 1.35
}
```

**Touch Interface:**
```css
/* Improve touch targets */
button, .touchable {
  min-height: 44px;
  min-width: 44px;
}

/* Prevent zoom on input focus */
input, select, textarea {
  font-size: 16px;
}
```

## ⚡ Performance Issues

### Issue: Slow Page Loads

#### Symptoms
- First contentful paint >2 seconds
- Large bundle sizes
- Poor Core Web Vitals scores

#### Solutions

**Bundle Analysis:**
```bash
# Analyze bundle size
ANALYZE=true npm run build

# Check largest dependencies
npx webpack-bundle-analyzer .next/static/chunks/*.js
```

**Performance Optimization:**
```javascript
// Implement code splitting
const CalendarComponent = dynamic(() => import('./Calendar'), {
  loading: () => <CalendarSkeleton />,
  ssr: false
})

// Optimize images
import Image from 'next/image'

// Preload critical resources
<link rel="preload" href="/fonts/font.woff2" as="font" type="font/woff2" crossOrigin="" />
```

**Caching Strategy:**
```javascript
// Service worker for offline support
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
})

module.exports = withPWA({
  // config
})
```

## 🚨 Emergency Procedures

### Complete System Recovery

**System Down:**
```bash
# 1. Check system resources
df -h && free -h

# 2. Restart Docker services
docker-compose down
docker-compose up -d

# 3. Check service health
curl -I http://localhost:9999/api/health
curl -I http://localhost:8001/health

# 4. If still failing, rebuild
docker-compose down
docker system prune -f
docker-compose build --no-cache
docker-compose up -d
```

**Data Recovery:**
```bash
# Restore from backup
docker-compose exec postgres pg_restore -U postgres -d barbershop_ai /backup/latest.sql

# Or restore from Supabase
# Use Supabase Dashboard → Database → Backups
```

**Rollback Deployment:**
```bash
# Git rollback
git log --oneline -10
git reset --hard <previous-commit-hash>

# Docker rollback
docker-compose down
git checkout <previous-version>
docker-compose up -d
```

### Critical Issue Escalation

**Contact Information:**
- **System Administrator**: admin@yourdomain.com
- **Lead Developer**: dev@yourdomain.com  
- **Emergency Hotline**: +1-XXX-XXX-XXXX

**Before Escalating:**
1. Collect system logs: `docker-compose logs > system-logs.txt`
2. Document error messages and steps to reproduce
3. Note the time when the issue started
4. Check if issue affects all users or specific ones
5. Try basic troubleshooting steps first

## 📋 Maintenance Checklist

### Daily Checks
- [ ] System health endpoints responding
- [ ] No error spikes in logs
- [ ] Database connections stable
- [ ] AI services responding

### Weekly Checks  
- [ ] Review error logs for patterns
- [ ] Check disk space usage
- [ ] Monitor performance metrics
- [ ] Test backup procedures

### Monthly Checks
- [ ] Update dependencies
- [ ] Security vulnerability scan
- [ ] Performance benchmarking
- [ ] Documentation updates

## 📞 Support Resources

### Internal Documentation
- **System Architecture**: `/docs/DEPLOYMENT_GUIDE.md`
- **API Reference**: `/docs/API_DOCUMENTATION.md`
- **Testing Guide**: `/docs/TESTING_GUIDE.md`

### External Resources
- **Next.js Documentation**: https://nextjs.org/docs
- **FastAPI Documentation**: https://fastapi.tiangolo.com
- **Supabase Documentation**: https://supabase.io/docs
- **Docker Documentation**: https://docs.docker.com

### Monitoring Dashboards
- **System Health**: http://localhost:9999/api/health
- **Application Metrics**: http://localhost:3001 (Grafana)
- **Database Monitoring**: Supabase Dashboard

---

## 🎯 Prevention Strategies

### Proactive Monitoring
- Set up automated health checks
- Configure alerting for critical thresholds
- Monitor resource usage trends
- Regular security scans

### Best Practices
- Always test in staging before production
- Keep dependencies up to date
- Document configuration changes
- Maintain regular backups
- Monitor performance metrics

**Remember**: Most issues can be prevented with proper monitoring, regular maintenance, and following best practices. When in doubt, check the logs first!

*Last Updated: September 2025*  
*Version: 5.0 - Complete Troubleshooting Guide*