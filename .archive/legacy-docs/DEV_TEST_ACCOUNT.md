# Development Test Account

## 🔐 Test Credentials for Local Development

Since Supabase Site URL is set to production (`https://bookedbarber.com`), use these email/password credentials for local development testing.

### Primary Test Account
```
Email: dev@bookedbarber.com
Password: DevTest123!@#
```

### Secondary Test Account (for multi-user testing)
```
Email: test@bookedbarber.com
Password: TestUser456$%^
```

### Admin Test Account
```
Email: admin@bookedbarber.com
Password: AdminDev789&*(
```

## 📝 How to Use

### For Local Development (localhost:9999):

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Navigate to login**:
   ```
   http://localhost:9999/login
   ```

3. **Use email/password** (NOT Google OAuth):
   - Enter test email
   - Enter test password
   - Click "Sign in"

4. **Result**:
   - ✅ Works perfectly locally
   - ✅ No Site URL conflicts
   - ✅ Full dashboard access

### Creating the Test Accounts:

#### Option A: Via Supabase Dashboard
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Authentication → Users
3. Click "Invite user"
4. Enter email and they'll get a password reset link

#### Option B: Via Your Register Page
1. Go to http://localhost:9999/register
2. Sign up with test credentials
3. Verify email if required

#### Option C: Via SQL (Direct Insert)
```sql
-- Run in Supabase SQL Editor
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  'dev@bookedbarber.com',
  crypt('DevTest123!@#', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);
```

## 🎯 Development Workflow

### Daily Development:
1. **Keep Site URL on production** - Never change it!
2. **Use email/password locally** - Works every time
3. **Test OAuth on production** - When needed

### Testing OAuth Features:
- Test on production URL: https://bookedbarber.com
- Or create a separate Supabase dev project (later)

## ⚠️ Important Notes

1. **DO NOT use these credentials in production**
2. **DO NOT commit real passwords to git**
3. **Change these passwords if repo becomes public**
4. **Each developer can create their own test account**

## 🔄 Quick Commands

### Login locally with test account:
```bash
# Start dev server
npm run dev

# Open browser
open http://localhost:9999/login

# Use credentials above
```

### Check if logged in (browser console):
```javascript
// Run in browser console
const { data: { user } } = await supabase.auth.getUser()
console.log('Logged in as:', user?.email)
```

### Sign out (browser console):
```javascript
// Run in browser console
await supabase.auth.signOut()
```

## 📊 Test Account Status

| Account | Created | Profile Complete | Onboarding Done |
|---------|---------|-----------------|-----------------|
| dev@bookedbarber.com | ✅ Yes | Yes | No |
| test@bookedbarber.com | ✅ Yes | Yes | No |
| admin@bookedbarber.com | ✅ Yes | Yes | No |

## 🚀 Benefits of This Approach

1. ✅ Production never breaks
2. ✅ Local development always works
3. ✅ No Site URL switching needed
4. ✅ Consistent test data
5. ✅ Fast development cycle

---

**Remember**: Email/password auth is unaffected by Site URL settings, making it perfect for local development!