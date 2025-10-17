# 🧪 Multi-Location Calendar Testing Checklist

## ✅ Database Verification Complete

**All checks passed:**
- ✅ Total Staff: 9 across 3 locations
- ✅ Total Customers: 193
- ✅ Total Appointments: 625
- ✅ Foreign Key Integrity: PASS
- ✅ Servers Running: Frontend (9999), Backend (8001)

---

## 📋 Manual Testing Checklist

### 1. Login & Initial Setup (2 minutes)

- [ ] Navigate to http://localhost:9999
- [ ] Log in as **Enterprise Owner**:
  - Email: `demo@barbershop.com`
  - Password: `Test123!`
- [ ] Verify successful login and redirect to dashboard

### 2. Test Location 1: Tomb45 Channelside (3 minutes)

**Expected Data:**
- 3 staff members (Marcus, Tony, Demo User)
- 231 total appointments
- 77 appointments per barber average
- Mix of COMPLETED (50%), CONFIRMED (40%), PENDING (5%), CANCELLED (4%)

**Tests:**
- [ ] Navigate to Calendar page
- [ ] Select "Tomb45 Channelside" from location dropdown
- [ ] Verify 3 barbers appear in resource view
- [ ] Verify appointments show on calendar
- [ ] Switch to **Day View**: Should see multiple appointments per barber
- [ ] Switch to **Week View**: Should see good coverage across week
- [ ] Switch to **Month View**: Should see appointments distributed across month
- [ ] Click on a COMPLETED appointment → Should show past date
- [ ] Click on a CONFIRMED appointment → Should show future date
- [ ] Click on a PENDING appointment → Should show status badge

### 3. Test Location 2: Tomb45 GasWorx (3 minutes)

**Expected Data:**
- 2 staff members (DeAndre Williams, Carlos Martinez)
- 120 total appointments
- 60 appointments per barber average
- Mix of COMPLETED (43%), CONFIRMED (48%), PENDING (5%), CANCELLED (4%)

**Tests:**
- [ ] Switch location to "Tomb45 GasWorx"
- [ ] Verify 2 barbers appear (DeAndre, Carlos)
- [ ] Verify different appointments load (not same as Channelside)
- [ ] Check Day View → Appointments for DeAndre and Carlos only
- [ ] Check Week View → No Marcus or Tony appointments
- [ ] Verify appointment density looks realistic (not empty)

### 4. Test Location 3: Elite Cuts LA (3 minutes)

**Expected Data:**
- 4 staff members (Jordan, Chris Bossio, David Rodriguez, Sophia Chen)
- 274 total appointments
- 68.5 appointments per barber average
- Mix of COMPLETED (49%), CONFIRMED (37%), PENDING (8%), CANCELLED (6%)

**Tests:**
- [ ] Switch location to "Elite Cuts LA"
- [ ] Verify 4 barbers appear
- [ ] Verify highest appointment count (274 total)
- [ ] Check all calendar views (Day, Week, Month)
- [ ] Verify no overlap with Tampa locations (different barbers/appointments)

### 5. Cross-Location Verification (2 minutes)

- [ ] Switch back to Channelside → Verify Marcus and Tony still show
- [ ] Switch to GasWorx → Verify DeAndre and Carlos show
- [ ] Switch to Elite Cuts → Verify 4 barbers show
- [ ] Confirm each location maintains separate appointment data

### 6. Appointment Details Testing (3 minutes)

For each location, test appointment details:
- [ ] Click random COMPLETED appointment → Verify past date
- [ ] Click random CONFIRMED appointment → Verify future date
- [ ] Verify appointment shows:
  - Customer name or "Walk-in" (if client_id is null)
  - Service name (Haircut, Fade, Beard Trim, etc.)
  - Duration (30-60 minutes)
  - Status badge (color-coded)
  - Barber name

### 7. Calendar Density Check (Visual) (2 minutes)

- [ ] **Tomb45 Channelside**: Should NOT look empty (231 appointments)
- [ ] **Tomb45 GasWorx**: Should show moderate density (120 appointments)
- [ ] **Elite Cuts LA**: Should be busiest (274 appointments)
- [ ] No calendar should be completely empty on any view
- [ ] Appointments should span past, present, and future dates

---

## 🐛 Common Issues & Fixes

### Issue: Calendar shows "No appointments"
**Fix:** Verify you selected the correct location from dropdown

### Issue: Wrong barbers showing
**Fix:** Refresh page or re-select location from dropdown

### Issue: API errors in console
**Fix:** Check that backend is running on port 8001:
```bash
curl http://localhost:8001/health
```

### Issue: Authentication errors
**Fix:** Clear browser cookies and re-login with demo@barbershop.com

---

## 📊 Success Criteria

**Calendar is working correctly if:**
1. ✅ Each location shows different barbers
2. ✅ Each location shows different appointments
3. ✅ Total appointments match verification counts (231, 120, 274)
4. ✅ Past appointments show COMPLETED status
5. ✅ Future appointments show CONFIRMED/PENDING status
6. ✅ Calendar density looks realistic (not sparse)
7. ✅ No foreign key errors in browser console
8. ✅ Location switching works smoothly

---

## 📈 Database Query Reference

If you need to verify data manually:

```javascript
// Query appointments for Channelside
node -e "
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { count } = await supabase
  .from('appointments')
  .select('id', { count: 'exact', head: true })
  .eq('barbershop_id', 'c5a58548-8f23-426c-bedc-49a83d238724');

console.log('Channelside appointments:', count);
"
```

---

## 🎯 Next Steps After Testing

Once manual testing is complete:

### If Calendar Works Perfectly ✅
1. Consider increasing appointment density (2x current amount)
2. Add transaction data for financial analytics
3. Seed product inventory for POS testing
4. Add more customer variation (VIP, regulars, etc.)

### If Issues Found ❌
1. Document specific issue (which location, what view, error message)
2. Check browser console for errors
3. Verify backend logs for API errors
4. Run verification script again: `node database/verify-seeded-data.js`

---

## 📁 Generated Files Reference

1. **`/database/redistribute-barbers.js`** - Barber redistribution script
2. **`/database/seed-customers.js`** - Customer generation script
3. **`/database/generate-realistic-appointments.js`** - Appointment seeding script
4. **`/database/verify-seeded-data.js`** - Verification script
5. **`/database/BARBER_REDISTRIBUTION_SUMMARY.md`** - Barber migration docs
6. **`/database/CUSTOMER_SEEDING_SUMMARY.md`** - Customer seeding docs
7. **`/database/APPOINTMENT_GENERATION_SUMMARY.md`** - Appointment docs
8. **`/database/TESTING_CHECKLIST.md`** - This file

---

**Happy Testing! 🎉**

If you encounter any issues, run the verification script first:
```bash
node database/verify-seeded-data.js
```

All data is production-ready and uses real Supabase PostgreSQL tables.
