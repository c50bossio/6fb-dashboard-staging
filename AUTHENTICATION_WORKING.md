# ✅ Authentication System - Working Configuration

## 🎯 IMPORTANT: Use Port 9999

**Always use port 9999 for this project** - it's the standard port for the 6FB AI Agent System.

## 🔐 Test Credentials (Ready to Use)

| Email | Password | Role | Port |
|-------|----------|------|------|
| demo@bookedbarber.com | Demo123!@# | User | 9999 |
| barber@bookedbarber.com | Barber123!@# | Barber | 9999 |
| owner@bookedbarber.com | Owner123!@# | Shop Owner | 9999 |

## 🌐 URLs

### Local Development
- **Frontend**: http://localhost:9999
- **Login**: http://localhost:9999/login
- **Register**: http://localhost:9999/register
- **Dashboard**: http://localhost:9999/dashboard (after login)
- **API**: http://localhost:9999/api/auth/*

### Production
- **Frontend**: https://bookedbarber.com
- **Login**: https://bookedbarber.com/login
- **Register**: https://bookedbarber.com/register
- **Dashboard**: https://bookedbarber.com/dashboard (after login)

## ⚠️ Current Status

### What's Working:
- ✅ Supabase database connected
- ✅ Test users created in Supabase Auth
- ✅ API endpoints implemented
- ✅ Login/Register UI pages exist
- ✅ Authentication provider configured

### Known Issue:
- ⚠️ **JavaScript Hydration**: React components not hydrating properly in production build
- ⚠️ **Special Characters**: Password special characters causing JSON parsing issues

## 🛠️ Quick Test Commands

```bash
# Start the application (port 9999)
cd "6FB AI Agent System"
PORT=9999 npm run dev

# Test login API
curl -X POST http://localhost:9999/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@bookedbarber.com", "password": "Demo123!@#"}'

# Check if server is running
curl http://localhost:9999/api/health
```

## 📝 Remember:
- **ALWAYS use port 9999** for this project
- Backend API runs on port 8001 (Docker)
- Frontend/Next.js runs on port 9999
- Development mode also uses port 9999 (not 3000 or 3001)

---
*Port 9999 is the standard for 6FB AI Agent System*