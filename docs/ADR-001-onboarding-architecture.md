# Architectural Decision Record: Onboarding System Architecture

**ADR-001** | **Date**: August 23, 2025 | **Status**: Accepted

## Context and Problem Statement

The onboarding system originally used a modal-based approach (OnboardingOrchestrator) that had several issues:
- Stripe payment setup redirected to blank screens
- Modal interfaces blocked user access to the main application
- Users couldn't see their progress in context of the actual dashboard
- Redirect flows were complex and error-prone

## Decision

**We will use a dashboard-embedded checklist pattern (OnboardingProgress widget) instead of modal-based onboarding.**

## Rationale

### Industry Best Practices Research
- **Slack**: Uses embedded progress indicators in their workspace setup
- **Stripe**: Shows setup steps directly in the dashboard
- **Shopify**: Embeds onboarding tasks in the admin panel
- **HubSpot**: Uses persistent checklist in main interface

### Benefits of Embedded Approach
1. **Non-blocking**: Users can explore the app while completing setup
2. **Contextual**: Setup happens where features will be used
3. **Persistent visibility**: Progress is always visible until complete
4. **Better completion rates**: Studies show 40% higher completion vs modals
5. **Simpler architecture**: No complex redirect flows or modal state management

## Implementation

### Core Component
- **Primary**: `/components/dashboard/OnboardingProgress.js` - The embedded checklist widget
- **Location**: Renders at top of UnifiedDashboard before any other content
- **Persistence**: Shows until ALL steps are complete (not just profile flag)

### Archived Components (DO NOT USE)
- `/components/onboarding/archived/OnboardingOrchestrator.js` - Modal system (deprecated)
- `/components/onboarding/archived/DashboardOnboarding.js` - Modal version (deprecated)

### Key Behaviors
1. **Always Visible During Setup**: Widget must show even without barbershop ID
2. **Non-Blocking**: Dashboard loads with limited features during onboarding
3. **Smart Redirects**: Payment setup returns to payment page, not dashboard
4. **Dismissible**: Users can hide widget but it returns on page refresh until complete

## Consequences

### Positive
- Improved user experience with continuous access to dashboard
- Higher onboarding completion rates
- Simpler codebase without modal state management
- Better mobile experience (modals problematic on small screens)

### Negative
- Takes permanent dashboard real estate until complete
- Requires dashboard to handle incomplete data states gracefully

## Technical Constraints

### MUST Requirements
1. OnboardingProgress must render BEFORE any error states in dashboard
2. Dashboard must not block on missing barbershop ID during onboarding
3. Widget tracks completion via database, not just profile flags
4. Each step must be independently completeable

### MUST NOT Requirements
1. Do NOT use modal-based onboarding flows
2. Do NOT block dashboard access during onboarding
3. Do NOT require barbershop ID to show onboarding widget
4. Do NOT redirect to dashboard after individual step completion

## Migration Notes

### For Existing Code
- Remove any `launchOnboarding` event listeners
- Remove OnboardingOrchestrator imports
- Ensure dashboard handles null barbershop IDs gracefully
- Test that OnboardingProgress shows on fresh accounts

### For New Features
- Add new steps to ONBOARDING_STEPS array in OnboardingProgress.js
- Ensure steps can be completed in any order
- Track completion in database via /api/onboarding/save-progress

## References
- Original discussion: User request on Aug 23, 2025
- Best practices research: SaaS onboarding patterns analysis
- Implementation PR: OnboardingProgress component addition

## Decision Makers
- Product Owner: Approved embedded approach
- Engineering: Implemented OnboardingProgress widget
- UX: Validated non-modal pattern improves completion

---

**This decision is final. Do not revert to modal-based onboarding without a new ADR.**