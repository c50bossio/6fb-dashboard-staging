# GitHub Spec-Kit Integration

**Date Installed**: October 7, 2025
**Version**: v0.0.57
**CLI Tool**: specify-cli v0.0.18

## What is Spec-Kit?

GitHub Spec-Kit is a **Spec-Driven Development toolkit** that provides a structured workflow for building software with AI agents. It enforces a methodical approach: define **what** and **why** before **how**.

## Installation Summary

### Package Installed
```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
```

### Project Initialization
```bash
specify init --here --ai claude --no-git --force
```

**Configuration**:
- AI Agent: Claude Code
- Script Type: sh (bash)
- Git: Skipped (existing repository preserved)

## Directory Structure Created

### `.specify/` - Spec-Kit Configuration
```
.specify/
├── memory/
│   └── constitution.md         # Project constitution (principles & standards)
├── scripts/
│   └── bash/
│       ├── common.sh           # Shared utilities
│       ├── check-prerequisites.sh
│       ├── create-new-feature.sh
│       ├── setup-plan.sh
│       └── update-agent-context.sh
└── templates/
    ├── agent-file-template.md  # Agent context file template
    ├── checklist-template.md   # Quality checklist template
    ├── plan-template.md        # Implementation plan template
    ├── spec-template.md        # Feature specification template
    └── tasks-template.md       # Task breakdown template
```

### `.claude/commands/` - Slash Commands
All 8 Spec-Kit slash commands are available:

**Core Workflow** (use in sequence):
1. `/speckit.constitution` - Establish project principles
2. `/speckit.specify` - Create feature specifications
3. `/speckit.plan` - Generate implementation plans
4. `/speckit.tasks` - Break down into actionable tasks
5. `/speckit.implement` - Execute implementation

**Optional Enhancement Commands**:
6. `/speckit.clarify` - Ask structured questions (before planning)
7. `/speckit.checklist` - Quality validation checklists (after planning)
8. `/speckit.analyze` - Cross-artifact consistency report (before implementing)

## Spec-Driven Development Workflow

### 1. Constitution Phase
Define project principles, standards, and non-negotiables:
```
/speckit.constitution
```
Creates `.specify/memory/constitution.md` with:
- Project vision and values
- Technical standards
- Quality requirements
- Development principles

### 2. Specification Phase
Create detailed feature specifications:
```
/speckit.specify
```
Outputs to `.specify/memory/specs/FEATURE-NNN-name.md`:
- Problem statement
- User stories
- Acceptance criteria
- Technical constraints
- Success metrics

### 3. Planning Phase
Generate implementation plan:
```
/speckit.plan
```
Outputs to `.specify/memory/plans/PLAN-NNN-name.md`:
- Architecture decisions
- Component breakdown
- Database schema changes
- API design
- Integration points

### 4. Task Breakdown Phase
Convert plan into actionable tasks:
```
/speckit.tasks
```
Outputs to `.specify/memory/tasks/TASKS-NNN-name.md`:
- Numbered task list
- Dependencies
- Complexity estimates
- Acceptance criteria per task

### 5. Implementation Phase
Execute the tasks:
```
/speckit.implement
```
- Follows task list systematically
- Updates progress tracking
- Validates against acceptance criteria

## Integration with Existing Protocols

Spec-Kit **complements** your existing development protocols:

### Full-Stack Development Protocol
- **Before**: Required frontend + backend + tests for every feature
- **After**: Spec-Kit formalizes the planning phase before implementation
- **Benefit**: Better architectural decisions before coding

### CLAUDE.md Instructions
- **Before**: Defines coding standards and patterns
- **After**: Spec-Kit adds structured specification layer
- **Benefit**: AI agents understand both "how to code" and "what to build"

### No Mock Data Policy
- **Before**: All data must come from real database
- **After**: Specs explicitly define database requirements
- **Benefit**: Database design happens in planning phase

## Helper Scripts

Located in `.specify/scripts/bash/`:

### `create-new-feature.sh`
Automates feature creation workflow:
```bash
./.specify/scripts/bash/create-new-feature.sh
```
Runs: constitution → specify → plan → tasks → implement

### `setup-plan.sh`
Sets up planning environment:
```bash
./.specify/scripts/bash/setup-plan.sh
```

### `check-prerequisites.sh`
Validates environment setup:
```bash
./.specify/scripts/bash/check-prerequisites.sh
```

## Security Considerations

### .gitignore Configuration
The `.claude/` directory is excluded from Git to prevent credential leakage:
```gitignore
# Claude Code agent folder (Spec-Kit - may contain credentials/tokens)
.claude/
.claude/settings.local.json
```

**Why**: Claude Code stores:
- Authentication tokens
- API keys
- Session data
- Private project context

**Important**: Never commit `.claude/settings.local.json` or any files in `.claude/`

## Example Workflow

### Creating a New Feature: "Customer Loyalty Program"

**Step 1: Define in Constitution**
```
/speckit.constitution

Add to constitution:
- Loyalty programs must integrate with existing customer profiles
- All loyalty calculations must be transparent to customers
- Loyalty data must be GDPR compliant
```

**Step 2: Create Specification**
```
/speckit.specify

Creates: .specify/memory/specs/FEATURE-023-customer-loyalty-program.md

Includes:
- User stories for customers earning points
- Acceptance criteria for redemption
- Integration with existing transaction system
- Database schema for loyalty points table
```

**Step 3: Generate Plan**
```
/speckit.plan

Creates: .specify/memory/plans/PLAN-023-customer-loyalty-program.md

Defines:
- New `loyalty_points` table schema
- API endpoints: POST /api/loyalty/earn, POST /api/loyalty/redeem
- Frontend dashboard components
- Integration with existing appointments/transactions
```

**Step 4: Break Down Tasks**
```
/speckit.tasks

Creates: .specify/memory/tasks/TASKS-023-customer-loyalty-program.md

Task list:
1. Create loyalty_points database migration
2. Implement loyalty calculation service
3. Create API endpoints with authentication
4. Build frontend loyalty dashboard component
5. Add loyalty display to customer profile
6. Write E2E tests for loyalty flow
7. Update documentation
```

**Step 5: Implement**
```
/speckit.implement

Executes tasks in order:
✅ Creates migration with proper foreign keys
✅ Implements service with business logic
✅ Adds API routes with proper validation
✅ Builds React components with real-time updates
✅ Tests complete workflow
✅ Documents API endpoints
```

## Benefits for This Project

### 1. Better Planning
- Architectural decisions documented before coding
- Database schemas designed upfront
- API contracts defined before implementation

### 2. AI Context Management
- Specs provide rich context for AI agents
- Plans guide AI implementation step-by-step
- Constitution ensures consistent quality

### 3. Quality Assurance
- Acceptance criteria defined in specs
- Checklists validate completeness
- Consistency reports catch conflicts

### 4. Team Collaboration
- Specifications serve as documentation
- Plans enable parallel work
- Tasks provide clear progress tracking

### 5. Compliance with Protocols
- Full-stack development enforced in planning
- No mock data policy validated in specs
- Database-first approach documented

## Integration with MCP

Spec-Kit works seamlessly with:

### Supabase MCP (Configured)
- Specs can reference database schema from Supabase
- Plans validate against existing tables
- Implementation queries real database structure

### Puppeteer MCP (Available)
- E2E tests defined in task lists
- Browser automation for acceptance testing
- Visual validation of implemented features

## Next Steps

### 1. Initialize Constitution
Run `/speckit.constitution` to define project standards specific to your barbershop management system.

### 2. Create Baseline Specs
Document existing features using `/speckit.specify` to establish baseline:
- User authentication flow
- Appointment booking system
- Dashboard analytics
- AI chat functionality

### 3. Plan New Features
For any new feature (e.g., Feature 016+), use full Spec-Kit workflow:
```
/speckit.specify → /speckit.plan → /speckit.tasks → /speckit.implement
```

### 4. Enhance Quality
Use optional commands for critical features:
```
/speckit.clarify (before planning)
/speckit.checklist (after planning)
/speckit.analyze (before implementing)
```

## Troubleshooting

### Slash Commands Not Appearing
**Solution**: Restart Claude Code to reload command definitions.

### Scripts Not Executable
**Solution**: Run `chmod +x .specify/scripts/bash/*.sh`

### Constitution Not Found
**Solution**: Run `/speckit.constitution` to create initial constitution file.

## Resources

- **GitHub Repository**: https://github.com/github/spec-kit
- **Documentation**: Available in `.claude/commands/speckit.*.md` files
- **Template Reference**: `.specify/templates/` directory
- **Helper Scripts**: `.specify/scripts/bash/` directory

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-07 | v0.0.57 | Initial installation and setup |

---

**Spec-Kit is now integrated and ready to use!** 🎉

Start with `/speckit.constitution` to establish your project's foundation.
