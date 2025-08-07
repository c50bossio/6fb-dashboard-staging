# 🚀 Supabase Quick Start Guide

## 1️⃣ Create Your .env.local File

```bash
# Copy the template
cp .env.local.example .env.local
```

## 2️⃣ Add Your Supabase Credentials

Edit `.env.local` and replace with your actual values:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3️⃣ Run Database Migration

1. Go to your Supabase Dashboard
2. Click on "SQL Editor" (left sidebar)
3. Click "New query"
4. Copy ALL content from `scripts/supabase-migration.sql`
5. Paste and click "Run"

You should see:
```
Success. No rows returned
```

## 4️⃣ Test Your Connection

```bash
# Test the connection
node scripts/test_supabase_connection.js
```

Expected output:
```
✅ Environment variables found
✅ Connection successful! Tables exist.
```

## 5️⃣ Migrate Your Data (Optional)

If you have existing SQLite data:

```bash
# Install Python dependencies
pip install supabase python-dotenv

# Run migration
python scripts/migrate_sqlite_to_supabase.py
```

## 6️⃣ Update Your Backend

The backend is already configured to use Supabase! The service will automatically detect and use Supabase when the environment variables are set.

## 7️⃣ Start Your Application

```bash
# Start the dev server
npm run dev

# In another terminal, start the backend
cd /Users/bossio/6FB\ AI\ Agent\ System
python main_complex.py
```

## 🎉 Success Indicators

- ✅ No SQLite connection errors
- ✅ Real-time updates work
- ✅ Data persists between restarts
- ✅ Can view data in Supabase dashboard

## 🆘 Troubleshooting

### "relation does not exist" error
→ Run the migration SQL in Supabase dashboard

### "Invalid API key" error
→ Check your .env.local credentials

### "Connection refused" error
→ Make sure you're using the correct URL

## 📊 Supabase Dashboard Features

Once set up, explore:
- **Table Editor**: View/edit data visually
- **SQL Editor**: Run queries
- **Auth**: Manage users
- **Storage**: File uploads
- **Realtime**: Monitor live changes

---

Ready? Let's test your Supabase connection once you've added the credentials!