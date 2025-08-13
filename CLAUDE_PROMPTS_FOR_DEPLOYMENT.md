# Claude Prompts for Website Updates

## 🎯 Use These Exact Prompts for Different Deployment Scenarios

### 1. Quick Updates (Direct to Production)
**For:** Bug fixes, small changes, content updates

```
"Make [specific change] and deploy directly to production. 
Test locally on localhost:9999 first, then commit and push to main for automatic deployment to bookedbarber.com."
```

**Example:**
```
"Update the pricing on the homepage from $99 to $149 and deploy directly to production. Test locally first, then commit and push to main."
```

### 2. New Features (Preview First)
**For:** New functionality, major UI changes, experimental features

```
"Create a feature branch for [feature name]. Implement [detailed description]. 
Deploy to Vercel preview URL for testing, then merge to production when approved."
```

**Example:**
```
"Create a feature branch for customer reviews system. Add a reviews page, display reviews on barber profiles, and create admin review management. Deploy to Vercel preview for testing first."
```

### 3. Experiments & Testing
**For:** Trying new ideas, A/B testing, proof of concepts

```
"Create an experimental branch to test [idea]. Deploy to preview URL so we can evaluate it before deciding whether to keep it."
```

**Example:**
```
"Create an experimental branch to test a new AI chat widget design. Deploy to preview URL so we can see how it looks and works before deciding."
```

### 4. Emergency Fixes
**For:** Critical bugs, security issues, immediate problems

```
"This is an emergency fix for [problem]. Implement the minimal fix needed, test quickly, and deploy immediately to production."
```

**Example:**
```
"This is an emergency fix for users unable to book appointments. Fix the booking form validation error and deploy immediately to production."
```

### 5. Multiple Related Changes
**For:** Feature sets, coordinated updates, complex workflows

```
"Work on [project name] in a feature branch. This includes: [list of changes]. 
Create preview deployment for thorough testing before production."
```

**Example:**
```
"Work on enhanced onboarding system in a feature branch. This includes: welcome flow improvements, profile setup wizard, and email notifications. Create preview deployment for testing."
```

## 🔄 Workflow Commands Claude Will Use

### Direct Deploy:
```bash
git add .
git commit -m "feat: your changes"
git push
# ✅ Auto-deploys to bookedbarber.com
```

### Preview Deploy:
```bash
git checkout -b feature/feature-name
# ... make changes ...
git add .
git commit -m "feat: new feature"
git push origin feature/feature-name
# ✅ Creates preview URL: https://6fb-ai-dashboard-abc123.vercel.app

# After testing:
git checkout main
git merge feature/feature-name
git push
# ✅ Deploys to bookedbarber.com
```

## 🎯 Quick Reference by Update Type

| Update Type | Prompt Template | Deployment Method |
|-------------|----------------|-------------------|
| **Bug Fix** | "Fix [issue] and deploy directly to production" | Direct push to main |
| **Content Update** | "Update [content] and deploy directly" | Direct push to main |
| **New Feature** | "Create feature branch for [feature]" | Preview → Production |
| **Experiment** | "Create experimental branch to test [idea]" | Preview only |
| **Emergency** | "Emergency fix for [critical issue]" | Direct push to main |
| **Major Update** | "Work on [project] in feature branch" | Preview → Production |

## 🚀 Environment URLs You'll Get

- **Development:** http://localhost:9999 (always test here first)
- **Preview:** https://6fb-ai-dashboard-[hash].vercel.app (for feature testing)
- **Production:** https://bookedbarber.com (live site)

## ⚡ Pro Tips

### Always Include:
1. **What to change** (be specific)
2. **How to deploy** (direct or preview)
3. **Testing requirements** (if any special testing needed)

### Good Prompts:
✅ "Add a contact form to the contact page and deploy directly to production"
✅ "Create feature branch for AI chat system with preview deployment for testing"
✅ "Emergency fix: booking confirmation emails not sending - deploy immediately"

### Avoid Vague Prompts:
❌ "Update the website"
❌ "Make it better"
❌ "Add some features"

## 🔧 Advanced Scenarios

### Testing with Stakeholders:
```
"Create feature branch for [feature]. Deploy to preview URL and provide the link for stakeholder review before production deployment."
```

### Database Changes:
```
"Implement [feature] that requires database changes. Use feature branch with preview deployment to test database migration safely."
```

### Performance Updates:
```
"Optimize [specific area] for performance. Deploy to preview first to measure performance improvements before production."
```

---

**Remember:** Claude will automatically handle the technical deployment steps. You just need to clearly communicate what you want changed and how you want it deployed!