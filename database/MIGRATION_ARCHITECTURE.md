# Barber Migration Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BARBER MIGRATION SYSTEM                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────┐       ┌──────────────────────────────────┐
│  Legacy Barbers     │       │    Migration Script              │
│  Table (5 barbers)  │──────▶│  migrate-barbers-to-profiles.js  │
└─────────────────────┘       └──────────────────────────────────┘
                                           │
                ┌──────────────────────────┼──────────────────────────┐
                │                          │                          │
                ▼                          ▼                          ▼
        ┌──────────────┐          ┌──────────────┐         ┌──────────────┐
        │  auth.users  │          │   profiles   │         │ barbershop_  │
        │              │          │              │         │    staff     │
        │ • email      │          │ • role       │         │ • commission │
        │ • password   │◀─────────│ • full_name  │◀────────│ • specialties│
        │ • metadata   │   ID     │ • bio        │   ID    │ • experience │
        └──────────────┘          └──────────────┘         └──────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    VERIFICATION SYSTEM                           │
└─────────────────────────────────────────────────────────────────┘

        ┌──────────────────────────────────┐
        │  Verification Script             │
        │  verify-barber-migration.js      │
        └──────────────────────────────────┘
                │
        ┌───────┼───────┬───────────┬────────────┐
        │       │       │           │            │
        ▼       ▼       ▼           ▼            ▼
    ┌─────┐ ┌──────┐ ┌──────┐ ┌─────────┐ ┌─────────┐
    │Auth │ │Profile│ │Staff │ │Commission│ │Integrity│
    │Check│ │Check  │ │Check │ │ Check   │ │  Check  │
    └─────┘ └──────┘ └──────┘ └─────────┘ └─────────┘
        │       │       │           │            │
        └───────┴───────┴───────────┴────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │ Verification     │
              │ Report Summary   │
              └──────────────────┘
```

## Data Flow

```
MIGRATION PROCESS
═════════════════

Step 1: Check Existing
┌──────────────────┐
│ Check if email   │
│ exists in auth   │──▶ EXISTS? ──▶ SKIP
└──────────────────┘      │
                          │ NOT EXISTS
                          ▼

Step 2: Create Auth User
┌──────────────────┐
│ Supabase Admin   │
│ Create User      │──▶ SUCCESS? ──▶ Continue
│ (email/password) │       │
└──────────────────┘       │ FAIL
                          ▼
                      ROLLBACK

Step 3: Create Profile
┌──────────────────┐
│ Insert into      │
│ profiles table   │──▶ SUCCESS? ──▶ Continue
│ (BARBER role)    │       │
└──────────────────┘       │ FAIL
                          ▼
                  Delete Auth User
                      ROLLBACK

Step 4: Create Staff Record
┌──────────────────┐
│ Insert into      │
│ barbershop_staff │──▶ SUCCESS? ──▶ COMPLETE
│ (60% commission) │       │
└──────────────────┘       │ FAIL
                          ▼
                  Delete Profile
                  Delete Auth User
                      ROLLBACK
```

## Database Schema

```
AUTH.USERS TABLE
════════════════
┌────────────────────────────────────┐
│ id              UUID (PK)          │
│ email           TEXT (UNIQUE)      │
│ encrypted_pwd   TEXT               │
│ email_confirmed BOOLEAN            │
│ created_at      TIMESTAMPTZ        │
│ user_metadata   JSONB              │
└────────────────────────────────────┘

PROFILES TABLE
══════════════
┌────────────────────────────────────┐
│ id              UUID (PK, FK)      │◀── Links to auth.users.id
│ email           TEXT (UNIQUE)      │
│ full_name       TEXT               │
│ phone           TEXT               │
│ role            TEXT               │◀── 'BARBER'
│ avatar_url      TEXT               │
│ bio             TEXT               │
│ barbershop_id   UUID (FK)          │◀── Links to barbershops
│ created_at      TIMESTAMPTZ        │
│ updated_at      TIMESTAMPTZ        │
└────────────────────────────────────┘

BARBERSHOP_STAFF TABLE
══════════════════════
┌────────────────────────────────────┐
│ id              UUID (PK)          │
│ barbershop_id   UUID (FK)          │◀── Links to barbershops
│ user_id         UUID (FK)          │◀── Links to auth.users.id
│ role            TEXT               │◀── 'BARBER'
│ commission_rate DECIMAL(3,2)       │◀── 0.60 (60%)
│ specialties     TEXT[]             │
│ experience_years INTEGER           │
│ is_active       BOOLEAN            │◀── true
│ hired_date      TIMESTAMPTZ        │
│ created_at      TIMESTAMPTZ        │
│ updated_at      TIMESTAMPTZ        │
└────────────────────────────────────┘
```

## Barber Data Structure

```
LEGACY BARBER DATA
══════════════════
{
  "id": "b1111111-1111-1111-1111-111111111111",
  "name": "Marcus \"The Artist\" Rodriguez",
  "email": "marcus.rodriguez@tomb45.com",
  "phone": "(813) 555-0101",
  "bio": "Master barber with 12 years...",
  "specialties": [
    "Classic Cuts",
    "Fades",
    "Beard Styling",
    "Hot Towel Shaves"
  ],
  "experience_years": 12,
  "avatar_url": "https://i.pravatar.cc/150?img=12",
  "barbershop_id": "c5a58548-8f23-426c-bedc-49a83d238724"
}

        │ MIGRATION
        ▼

NEW STRUCTURE
═════════════

AUTH USER
─────────
email: marcus.rodriguez@tomb45.com
password: TempPass2025!
metadata: { full_name, phone, avatar_url }
         │
         │ ID: abc123...
         ▼

PROFILE
───────
id: abc123...  ◀── Same as auth user
role: BARBER
full_name: Marcus "The Artist" Rodriguez
bio: Master barber with 12 years...
barbershop_id: c5a58548-8f23-426c-bedc-49a83d238724
         │
         │ user_id: abc123...
         ▼

STAFF RECORD
────────────
user_id: abc123...  ◀── Same as auth user & profile
commission_rate: 0.60
specialties: ["Classic Cuts", "Fades", ...]
experience_years: 12
is_active: true
```

## Migration States

```
BARBER MIGRATION STATES
═══════════════════════

┌─────────────┐
│   PENDING   │ Initial state (not migrated)
└─────────────┘
      │
      │ Start Migration
      ▼
┌─────────────┐
│  MIGRATING  │ Migration in progress
└─────────────┘
      │
      ├──▶ ┌─────────────┐
      │    │   SUCCESS   │ Auth + Profile + Staff created
      │    └─────────────┘
      │
      ├──▶ ┌─────────────┐
      │    │   SKIPPED   │ Already exists (idempotent)
      │    └─────────────┘
      │
      └──▶ ┌─────────────┐
           │   FAILED    │ Error occurred, rolled back
           └─────────────┘
```

## Error Handling Flow

```
ERROR HANDLING & ROLLBACK
═════════════════════════

┌────────────────────┐
│ Start Migration    │
└────────────────────┘
         │
         ▼
┌────────────────────┐     ┌─────────────────┐
│ Create Auth User   │────▶│ Auth Created    │
└────────────────────┘     └─────────────────┘
         │                          │
         │ ERROR                    │ SUCCESS
         ▼                          ▼
┌────────────────────┐     ┌─────────────────┐
│ Report Error       │     │ Create Profile  │
│ Exit               │     └─────────────────┘
└────────────────────┘              │
                                    │ ERROR        SUCCESS
                                    ▼              │
                            ┌─────────────────┐   │
                            │ Delete Auth     │   │
                            │ Report Error    │   │
                            │ Exit            │   │
                            └─────────────────┘   │
                                                  ▼
                                          ┌─────────────────┐
                                          │ Create Staff    │
                                          └─────────────────┘
                                                  │
                                    ERROR         │ SUCCESS
                                    ▼             ▼
                            ┌─────────────────┐   ┌─────────────────┐
                            │ Delete Profile  │   │ Migration       │
                            │ Delete Auth     │   │ Complete!       │
                            │ Report Error    │   └─────────────────┘
                            │ Exit            │
                            └─────────────────┘
```

## Verification Architecture

```
VERIFICATION CHECKS
═══════════════════

1. AUTH CHECK
   ┌──────────────────────────────┐
   │ List all auth users          │
   │ Filter by email domain       │
   │ Count: 5 expected            │
   │ ✅ All 5 barbers exist       │
   └──────────────────────────────┘

2. PROFILE CHECK
   ┌──────────────────────────────┐
   │ Query profiles table         │
   │ Filter by email list         │
   │ Verify role = 'BARBER'       │
   │ ✅ All 5 profiles exist      │
   └──────────────────────────────┘

3. STAFF CHECK
   ┌──────────────────────────────┐
   │ Query barbershop_staff       │
   │ Filter by user_id list       │
   │ Verify commission = 0.60     │
   │ ✅ All 5 staff records exist │
   └──────────────────────────────┘

4. INTEGRITY CHECK
   ┌──────────────────────────────┐
   │ For each auth user:          │
   │   ✓ Has matching profile?    │
   │   ✓ Has matching staff?      │
   │   ✓ IDs match across tables? │
   │ ✅ All links verified        │
   └──────────────────────────────┘

         ▼
   ┌──────────────────────────────┐
   │ VERIFICATION SUMMARY         │
   │ ✅ Auth Users:     PASS      │
   │ ✅ Profiles:       PASS      │
   │ ✅ Staff Records:  PASS      │
   │ ✅ Data Integrity: PASS      │
   └──────────────────────────────┘
```

## User Access Flow

```
POST-MIGRATION USER FLOW
════════════════════════

Barber receives credentials
         │
         ▼
┌─────────────────────┐
│ Navigate to /login  │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Enter email         │
│ Enter temp password │◀── TempPass2025!
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Supabase Auth       │
│ Validates           │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Redirect to         │
│ password reset      │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Set new password    │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Redirect to         │
│ /barber/dashboard   │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│ Full dashboard      │
│ access granted!     │
│ • Calendar          │
│ • Appointments      │
│ • Profile           │
│ • Earnings          │
│ • Landing Page      │
└─────────────────────┘
```

## Commission Structure

```
FINANCIAL CONFIGURATION
═══════════════════════

Service Price: $50.00
         │
         ▼
┌─────────────────────┐
│ Commission Split    │
│ (60/40 model)       │
└─────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│Barber │ │ Shop  │
│$30.00 │ │$20.00 │
│(60%)  │ │(40%)  │
└───────┘ └───────┘

STORED IN DATABASE:
barbershop_staff.commission_rate = 0.60

CALCULATION:
barber_amount = service_price * commission_rate
shop_amount = service_price * (1 - commission_rate)
```

## File Structure

```
6FB AI Agent System/
├── database/
│   ├── migrate-barbers-to-profiles.js    ◀── Main migration script
│   ├── verify-barber-migration.js         ◀── Verification script
│   ├── BARBER_MIGRATION_README.md         ◀── Full documentation
│   ├── QUICK_START_BARBER_MIGRATION.md    ◀── Quick reference
│   └── MIGRATION_ARCHITECTURE.md          ◀── This file
├── BARBER_MIGRATION_SUMMARY.md            ◀── Implementation summary
└── package.json                           ◀── NPM scripts

NPM SCRIPTS:
• npm run migrate:barbers  ──▶ Run migration
• npm run verify:barbers   ──▶ Verify results
```

---

**Architecture Version**: 1.0.0
**Last Updated**: 2025-10-11
**Compatibility**: Supabase PostgreSQL + Next.js 14
