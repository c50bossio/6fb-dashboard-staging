<!--
SYNC IMPACT REPORT
==================
Version Change: Template → 1.0.0
Changes Made:
  - Initial constitution creation for 6FB AI Agent System
  - Defined 7 core principles for barbershop management platform
  - Established technical standards and database policies
  - Added development workflow and governance rules

Modified Principles:
  - PRINCIPLE_1: Database-First Architecture (Supabase PostgreSQL)
  - PRINCIPLE_2: Full-Stack Completeness (No Half-Implementations)
  - PRINCIPLE_3: Zero Mock Data Policy (Production-Ready Data)
  - PRINCIPLE_4: Multi-Tenant Security (RLS & RBAC)
  - PRINCIPLE_5: Test-Driven Quality (95% Coverage for Critical)
  - PRINCIPLE_6: AI-Native Development (LLM Integration Required)
  - PRINCIPLE_7: Barber Operations Hierarchy (Individual → Enterprise)

Added Sections:
  - Technical Standards (enforces Next.js 14, FastAPI, Supabase)
  - Development Workflow (spec-driven development integration)
  - Governance (amendment process, compliance validation)

Templates Requiring Updates:
  ✅ plan-template.md - Constitution check section aligned
  ✅ spec-template.md - Database and full-stack requirements added
  ✅ tasks-template.md - Test coverage and RLS validation tasks added

Follow-up TODOs:
  - None - All placeholders resolved
-->

# 6FB AI Agent System Constitution

**Enterprise-Grade Barbershop Management Platform with AI Intelligence**

## Core Principles

### I. Database-First Architecture (NON-NEGOTIABLE)

**All data storage MUST use Supabase PostgreSQL.**

Requirements:
- NO SQLite in production or development
- NO local JSON files for data storage
- NO in-memory storage for persistent data
- MUST use Supabase Auth for authentication
- MUST use Supabase Realtime for live updates
- MUST use Row Level Security (RLS) on all tables
- MUST define schemas in Supabase migrations

Rationale: We are building for a REAL barbershop going live soon. Production-ready database from day one ensures data integrity, scalability, and security. Supabase provides authentication, real-time capabilities, and PostgreSQL reliability in one unified platform.

### II. Full-Stack Completeness (NON-NEGOTIABLE)

**NEVER create frontend without backend. NEVER create backend without frontend.**

Requirements:
- Every feature MUST have functional backend API endpoints
- Every API endpoint MUST have corresponding UI representation
- Every feature MUST include proper integration between layers
- Dashboard visibility MUST be implemented for all features
- User workflows MUST be complete end-to-end

Prohibited:
- ❌ API endpoints with no UI implementation
- ❌ UI components with hardcoded data
- ❌ Half-finished features marked as "done"
- ❌ Backend-only or frontend-only implementations

Rationale: Incomplete features provide zero user value. Full-stack completeness ensures immediate business utility and prevents technical debt from accumulating.

### III. Zero Mock Data Policy (NON-NEGOTIABLE)

**This application NEVER uses mock data. All data comes from real database operations.**

Requirements:
- MUST query actual Supabase tables for all data
- MUST create database tables with proper SQL schemas
- MUST seed test data using database INSERT operations
- MUST show loading states during database queries
- MUST handle empty states gracefully

Prohibited:
- ❌ `generateMock*()` functions
- ❌ Hardcoded fallback data objects
- ❌ Fake placeholder data arrays
- ❌ Mock data generators of any kind

Rationale: Mock data generation causes 10+ second loading delays and creates false assumptions about data structure. Real database operations are faster, ensure consistency, and catch integration issues early.

### IV. Multi-Tenant Security

**All data access MUST respect organization boundaries and user roles.**

Requirements:
- MUST implement Row Level Security (RLS) on all Supabase tables
- MUST validate organization_id in all database queries
- MUST enforce role-based access control (RBAC): CLIENT, BARBER, SHOP_OWNER, ENTERPRISE_OWNER, SUPER_ADMIN
- MUST implement proper authentication middleware
- MUST validate user permissions before data modifications

User Hierarchy:
- **Individual Barbers**: Access own appointments, services, customers
- **Shop Owners**: Access all barbers in their shop(s)
- **Enterprise Owners**: Access all shops in their organization
- **Super Admin**: System-wide access with audit logging

Rationale: Multi-location barbershop operations require strict data isolation. RLS at database level provides defense-in-depth security beyond application-level checks.

### V. Test-Driven Quality

**Critical components MUST have 95% test coverage. All features MUST have E2E tests.**

Requirements:
- MUST write tests before implementation (TDD for critical paths)
- MUST achieve 95% coverage for: NuclearInput.js, authentication, payment processing
- MUST achieve 85% minimum coverage for all other components
- MUST include E2E tests for complete user workflows
- MUST use triple-tool testing: Playwright + Puppeteer + Computer Use AI
- MUST validate cross-browser compatibility: Chrome, Firefox, Safari, Mobile

Test Categories Required:
- Unit tests (Jest + React Testing Library)
- Integration tests (API + database operations)
- E2E tests (complete user flows)
- Visual regression tests
- Accessibility tests (WCAG 2.2 AA)
- Performance tests (Core Web Vitals)

Rationale: Barbershop operations involve financial transactions, customer data, and scheduling. High test coverage prevents revenue-impacting bugs and maintains customer trust.

### VI. AI-Native Development

**All business intelligence features MUST integrate real AI models.**

Requirements:
- MUST use OpenAI GPT-5, Claude Opus 4.1, or Gemini 2.0 Flash
- MUST provide model selection in AI chat interface
- MUST maintain conversation context across sessions
- MUST implement proper AI agent handoffs (Master Triage → Specialists)
- MUST include guardrails for customer data protection
- MUST log AI interactions for quality improvement

AI Agent Requirements:
- Financial Coach Agent (revenue, expenses, profitability)
- Operations Manager Agent (scheduling, efficiency, staff)
- Marketing Expert Agent (customer acquisition, retention)
- Customer Service Agent (support, feedback, resolution)
- Booking Intelligence Agent (appointment optimization)
- Analytics Agent (data analysis, insights, trends)
- Master Triage Agent (central coordinator)

Rationale: AI agents provide business insights that would require expensive consultants. Real LLM integration (not mock responses) ensures actionable intelligence for barbershop owners.

### VII. Barber Operations Hierarchy

**System MUST scale from individual barbers to multi-location enterprises.**

Architecture Layers:
1. **Individual Barber Level**
   - Personal landing pages at `barbershop.com/barber-name`
   - Custom services, pricing, and branding
   - Private customer lists and appointment history
   - Financial tracking (commission or booth rent)

2. **Shop Owner Level**
   - Multi-barber management
   - Product inventory with POS system
   - Financial oversight (commission/booth rent management)
   - Staff scheduling and performance analytics
   - View switching (read-only access to barber dashboards)

3. **Enterprise Owner Level**
   - Multi-location management
   - Cross-shop analytics and reporting
   - Centralized brand management
   - Franchise operations support

Requirements:
- MUST support both commission and booth rent financial models
- MUST allow flexible tip distribution (100% to barber or split)
- MUST provide barber-specific landing pages with custom branding
- MUST enable shop owners to view (but not edit) barber dashboards

Rationale: Barbershop businesses vary from solo operators to multi-location enterprises. Flexible hierarchy accommodates growth from individual to franchise without platform migration.

## Technical Standards

### Technology Stack (NON-NEGOTIABLE)

**Frontend**:
- Next.js 14 with App Router
- React 18 with client/server components
- Tailwind CSS + Headless UI
- FullCalendar.io Premium (resource management)
- Recharts for analytics visualization

**Backend**:
- Next.js API Routes (primary)
- FastAPI (Python backend for AI services)
- Supabase PostgreSQL (only database)
- Supabase Auth (OAuth providers)

**Real-time & AI**:
- Pusher for WebSocket connections
- OpenAI GPT-5 (default), Claude Opus 4.1, Gemini 2.0 Flash
- Stripe for payment processing

**Testing & Deployment**:
- Playwright (E2E primary)
- Puppeteer MCP (debugging)
- Computer Use AI (visual validation)
- Docker Compose (development)
- Vercel (deployment recommended)

### Code Quality Standards

**Mandatory Practices**:
- ESLint with Next.js configuration (NEVER disable linting)
- Automatic formatting via `eslint --fix`
- TypeScript optional but encouraged
- Comprehensive inline documentation
- Error boundaries on all routes
- Loading states for async operations
- Proper ARIA labels for accessibility

**Security Practices**:
- Row Level Security (RLS) on ALL database tables
- Input validation on all API endpoints
- Rate limiting on public endpoints
- Environment variables for secrets (NEVER commit)
- CORS configuration for API routes
- GDPR compliance for customer data

### Database Schema Standards

**Table Requirements**:
- MUST use UUIDs for primary keys
- MUST include `created_at` and `updated_at` timestamps
- MUST have proper foreign key constraints
- MUST implement RLS policies
- MUST have indexes for query performance
- MUST use migrations for schema changes

**Multi-Tenancy**:
- ALL tables MUST include `organization_id` (except `organizations` table)
- RLS policies MUST filter by `organization_id`
- Cross-organization queries PROHIBITED (except SUPER_ADMIN)

## Development Workflow

### Spec-Driven Development

**For every feature implementation, MUST follow**:

1. **Constitution Review** - Validate feature aligns with principles
2. **Specification** - Create detailed spec using `/speckit.specify`
   - Problem statement
   - User stories
   - Acceptance criteria
   - Database schema design
   - API contract definition

3. **Planning** - Generate implementation plan using `/speckit.plan`
   - Architecture decisions
   - Component breakdown
   - Integration points
   - Testing strategy

4. **Task Breakdown** - Convert plan to tasks using `/speckit.tasks`
   - Numbered task list
   - Dependencies identified
   - Complexity estimates
   - Acceptance criteria per task

5. **Implementation** - Execute tasks using `/speckit.implement`
   - Database schema creation (Supabase migration)
   - Backend API with real database queries
   - Frontend components with API integration
   - E2E tests for complete workflow
   - Dashboard representation

6. **Validation** - Verify completeness
   - All tests passing (95% coverage for critical)
   - No mock data used
   - Full-stack integration working
   - RLS policies validated
   - Cross-browser tested
   - Accessibility compliance verified

### Pre-Development Checklist

**Before starting ANY feature, Claude MUST assess**:

- [ ] Backend API endpoints required
- [ ] Frontend components needed
- [ ] Database schema changes (Supabase tables)
- [ ] Real database operations (NO MOCK DATA)
- [ ] Integration points (frontend ↔ backend)
- [ ] Dashboard representation (where users see it)
- [ ] Authentication/authorization requirements
- [ ] Multi-tenant data isolation (RLS policies)
- [ ] Test coverage strategy
- [ ] AI integration requirements (if applicable)

### Completion Criteria

**A feature is ONLY complete when**:

✅ Backend API endpoints exist and query real Supabase tables
✅ Frontend UI components are functional and integrated
✅ Database schema is migrated to Supabase with RLS
✅ End-to-end tests pass across browsers
✅ Dashboard shows feature with real data
✅ Loading and error states handled
✅ Accessibility requirements met
✅ No mock data anywhere
✅ Documentation updated
✅ Code reviewed and approved

## Governance

### Amendment Process

**Constitution changes require**:
1. Documented justification (why existing principle insufficient)
2. Impact assessment on existing features
3. Migration plan for affected code
4. Template updates (specs, plans, tasks)
5. Version bump following semantic versioning:
   - **MAJOR**: Backward incompatible principle changes
   - **MINOR**: New principles added or material expansions
   - **PATCH**: Clarifications, wording fixes, refinements

### Compliance Validation

**All PRs/reviews MUST verify**:
- No SQLite usage (Supabase only)
- No mock data generators
- Full-stack completeness
- RLS policies on new tables
- Test coverage meets thresholds
- No disabled ESLint rules
- Accessibility compliance
- Multi-tenant data isolation

**Architecture Review Required For**:
- New database tables
- New AI agent integrations
- Third-party API integrations
- Authentication/authorization changes
- Financial calculation logic
- Customer data handling

### Escalation Path

**When principles conflict**:
1. **Database-First** overrides convenience
2. **Full-Stack Completeness** overrides partial delivery
3. **Zero Mock Data** overrides prototyping shortcuts
4. **Security** overrides performance optimizations
5. **Test Coverage** overrides rapid deployment

**Final Authority**: Project owner (Chris Bossio / c50bossio@gmail.com)

### Runtime Development Guidance

For detailed implementation patterns, refer to:
- `CLAUDE.md` - AI agent development instructions
- `FULLSTACK_DEVELOPMENT_PROTOCOL.md` - Feature completion requirements
- `SUPABASE_PRODUCTION_RULE.md` - Database usage enforcement
- `SPEC_KIT_SETUP.md` - Spec-driven development workflow

---

**Version**: 1.0.0 | **Ratified**: 2025-10-07 | **Last Amended**: 2025-10-07
