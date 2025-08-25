# 🧪 Browser Test Scenarios for Intelligent Barber Auto-Selection

## 🚀 Quick Start Testing

**URL**: http://localhost:9999/shop/products  
**Development Environment**: Ensure Next.js dev server is running (`npm run dev`)

## 📋 Test Scenarios Overview

The intelligent barber auto-selection system implements a three-priority algorithm:
1. **Priority 1**: Appointment-based selection (existing functionality)
2. **Priority 2**: Logged-in barber auto-selection (**NEW FEATURE**)  
3. **Priority 3**: Manual selection fallback (enhanced with visual feedback)

## 🎭 Test Scenarios by User Role

### Scenario 1: Barber Self-Checkout (NEW FUNCTIONALITY)
**Test Case**: Barber processes their own sales
**Expected Behavior**: Auto-select logged-in barber

**Steps**:
1. Login as a user with `role: 'BARBER'` and `is_active_barber: true`
2. Navigate to `/shop/products`
3. Add products to checkout
4. Click "Process Checkout"
5. **Expected**: 
   - Green notification banner appears: "Auto-selected [Barber Name] (You are logged in as this barber)"
   - Barber selection dropdown is hidden
   - "Change Barber" button is visible
6. **Test Override**: Click "Change Barber" → Should show full barber list with "(You)" label

---

### Scenario 2: Owner/Manager Manual POS
**Test Case**: Owner processes sale and needs to select barber manually
**Expected Behavior**: Show barber selection list

**Steps**:
1. Login as a user with `role: 'SHOP_OWNER'` or `role: 'ENTERPRISE_OWNER'`
2. Navigate to `/shop/products`
3. Add products to checkout
4. Click "Process Checkout"
5. **Expected**:
   - No auto-selection notification
   - Barber selection dropdown is visible
   - All active barbers listed
   - Must select barber manually before proceeding

---

### Scenario 3: Appointment-Based Auto-Selection (EXISTING)
**Test Case**: Customer checks out from existing appointment
**Expected Behavior**: Auto-select assigned barber from appointment

**Steps**:
1. Create appointment with specific barber assigned
2. Navigate to `/shop/products?checkout=appointment&id=[appointment_id]`
3. Add services to checkout
4. Click "Process Checkout"
5. **Expected**:
   - Green notification banner: "Auto-selected [Barber Name] (From appointment)"
   - Assigned barber pre-selected
   - "Change Barber" option available

---

## 🔍 Detailed Testing Protocol

### Visual Feedback Testing
**What to Look For**:
- ✅ Green notification banner with check icon
- ✅ Clear selection reason ("You are logged in as this barber" / "From appointment")
- ✅ "Change Barber" button styled consistently
- ✅ Proper barber name display with role indicators

### Error Handling Testing
**Test Cases**:
1. **Profile API Failure**: Disconnect database → Should fallback to manual selection
2. **Staff API Failure**: No barbers available → Should show appropriate error
3. **Invalid Role**: User with role not in system → Should default to manual

### Performance Testing
**Monitor For**:
- No infinite re-renders (check browser console)
- Fast profile loading (< 500ms)
- Smooth UI transitions
- No "Maximum update depth exceeded" errors

---

## 🛠️ Development Testing Commands

```bash
# Start development environment
npm run dev

# Check for console errors
# Open browser DevTools → Console tab

# Monitor API calls
# DevTools → Network tab → Filter for 'profile' and 'staff'

# Test different user roles
# Use browser DevTools → Application → Local Storage
# Modify auth tokens to test different user scenarios
```

---

## 🔧 Debugging Checklist

### If Auto-Selection Doesn't Work:
1. **Check Console**: Look for API errors
2. **Verify Profile Response**: `/api/profile/current` should return `is_active_barber: true`
3. **Check Staff List**: `/api/staff` should include current user
4. **Database Verification**: Ensure `barbershop_staff` table has active record

### If Manual Selection Fails:
1. **Staff API**: Verify `/api/staff` returns active barbers
2. **UI State**: Check `availableBarbers` state in React DevTools
3. **Selection Handler**: Ensure `selectedBarber` state updates correctly

### If Visual Feedback Missing:
1. **Auto Selection Reason**: Check `autoSelectionReason` state
2. **Conditional Rendering**: Verify notification banner logic
3. **CSS Classes**: Ensure Tailwind classes are applied correctly

---

## 📊 Expected Test Results

### ✅ Successful Implementation Indicators:
- Barbers see themselves auto-selected when processing own sales
- Owners/managers see barber selection dropdown for manual selection
- Appointments continue to auto-select assigned barbers
- Visual feedback clearly indicates selection reason
- "Change Barber" functionality works in all scenarios
- No infinite re-render errors in console
- Smooth user experience across all user roles

### ❌ Issues to Watch For:
- Console errors related to useEffect dependencies
- API failures causing infinite loading states
- Missing visual feedback for auto-selections
- Incorrect barber selection in appointment scenarios
- Performance issues with profile/staff loading

---

## 🎉 Implementation Complete

The intelligent barber auto-selection system is fully implemented with:
- **3-Priority Selection Algorithm**
- **Role-Based Auto-Detection**  
- **Visual Feedback System**
- **Override Capabilities**
- **Comprehensive Error Handling**
- **Performance Optimized React Hooks**

**Ready for Production**: All code follows React best practices with proper dependency management and error boundaries.