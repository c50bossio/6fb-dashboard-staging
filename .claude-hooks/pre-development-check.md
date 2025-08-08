# Pre-Development Protocol Check

## 🚨 STOP: Before Any Development

Before Claude starts ANY feature development, this checklist MUST be completed:

### 1. Full-Stack Scope Definition
- [ ] **Backend needed?** What APIs/endpoints are required?
- [ ] **Frontend needed?** What UI components are required?
- [ ] **Dashboard integration?** Where will users interact with this feature?
- [ ] **Database changes?** What data structures are needed?

### 2. Complete Implementation Plan
Create TodoWrite with BOTH:
- [ ] Backend implementation tasks
- [ ] Frontend implementation tasks  
- [ ] Integration tasks
- [ ] Dashboard representation tasks
- [ ] Testing tasks

### 3. Value Delivery Check
- [ ] Does this feature solve a complete user problem?
- [ ] Can the user complete the entire workflow?
- [ ] Is this feature discoverable in the dashboard?
- [ ] Does this provide immediate user value?

## ❌ FORBIDDEN ACTIONS
- Creating API endpoints without frontend forms
- Building UI components without backend connectivity  
- Implementing features without dashboard integration
- Creating half-done features with "TODO: Connect later"

## ✅ SUCCESS CRITERIA
A feature is only complete when:
- User can complete entire workflow in browser
- Feature is accessible from dashboard
- Error handling works properly
- Loading states provide good UX
- Feature integrates with existing architecture

---

**Remember**: No feature is complete until it's a fully functional, integrated solution that provides immediate user value through the dashboard interface.