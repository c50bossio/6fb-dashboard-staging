# CLAUDE-WORKFLOWS.md

## Development Workflow

### Before Making Changes
1. Start dev environment: `./docker-dev-start.sh`
2. Check system health: `npm run claude:health`
3. Verify no lint/type errors: `npm run lint && npm run build`

### After Making Changes
1. Fix any linting issues: `npm run lint:fix`
2. Run full test suite: `npm run test:all`
3. Verify production build: `npm run build`
4. Check security if needed: `npm run test:security:quick`

### Feature Development Checklist
- [ ] Database schema with RLS policies
- [ ] Backend API endpoint (FastAPI router)
- [ ] Frontend UI with error handling
- [ ] Tests written and passing
- [ ] Real data integration (no mocks)
- [ ] Authentication/authorization implemented

## Common Development Patterns

### Adding New API Endpoints
1. Create router in `routers/` directory
2. Add route to `fastapi_backend.py`
3. Implement database queries in `lib/supabase-query.js`
4. Add frontend API calls in `lib/api.js`

### Adding New UI Components
1. Create in appropriate `components/` subdirectory
2. Use existing UI components from `components/ui/`
3. Follow Tailwind CSS patterns
4. Implement error boundaries for complex components

### Database Operations
- Always use `lib/supabase-query.js` functions
- Implement RLS policies for security
- Use real-time subscriptions for live updates
- Handle optimistic updates for better UX

## Testing Strategy
- **Jest**: Unit tests with 80% coverage threshold
- **Playwright**: E2E tests with HTML reports
- **Security**: Comprehensive scanning with `npm run test:security`
- **Nuclear Tests**: High-impact scenarios for critical systems

## Business Model Context

### Freemium Strategy: "Insights Free, Agents Paid"
- **Free**: Business insights, analytics, basic booking, reminders
- **Paid**: AI agents ($0.04/1K tokens), SMS ($0.01/msg), Email ($0.001/msg)
- **Strategy**: Just-in-time billing modals, strategic upgrade CTAs

### Implementation Approach
- Remove billing from onboarding → focus on value delivery
- "Launch Agent" buttons throughout dashboard trigger billing setup
- Value-first messaging shows ROI before payment requests