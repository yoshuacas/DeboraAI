# DeboraAI - Quick Start Guide

## What's Been Built So Far

✅ **CORE FUNCTIONALITY COMPLETE!** 🎉
- Next.js 14 project with TypeScript and Tailwind
- Git worktrees: `staging/` (port 3000) and `production/` (port 3001)
- SQLite databases with comprehensive schema
- User authentication models (ADMIN and CUSTOMER roles)
- **Testing infrastructure (Jest + Playwright + Test Runner)**
- **Code Modification Engine (Protected files, FileManager, Validator, GitManager)**
- **AI Agent (Claude 3.5 Sonnet via AWS Bedrock)**
- **Working API** - Accepts natural language, generates & applies code!

## Current Status

**Project Progress:** ~16% complete (19-21/140 hours)
**Phases Completed:** Phases 1-5 (Foundation → Database → Testing → Code Engine → AI Agent)
**Remaining:** Phases 6-11 (~90-116 hours)

**🎉 MILESTONE:** Natural language → Working code in ~8-10 seconds!

See `IMPLEMENTATION_STATUS.md`, `ARCHITECTURE.md`, and `API_GUIDE.md` for full details.

---

## Quick Commands

### View Project Structure
```bash
cd /Users/davcasd/research/DeboraAI
ls -la                    # See staging/ and production/ worktrees
```

### Staging Environment
```bash
cd staging
npm run dev               # Start staging server (port 3000)
npm test                  # Run tests (IMPORTANT: do this before deploying!)
git branch               # Should show: staging
```

### Production Environment
```bash
cd production
npm run dev               # Start production server (port 3001)
git branch               # Should show: main
```

### Testing Commands (NEW - Phase 3 Complete!)
```bash
cd staging
npm test                  # Run all unit tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage report
npm run test:e2e          # Run E2E tests with Playwright
```

### Database Operations
```bash
cd staging  # or production
npx prisma studio         # Visual database browser
npx prisma migrate dev    # Create new migration
npx prisma db seed        # Reseed database with default users
```

### Running Tests

**Testing infrastructure is fully operational!**

```bash
cd staging

# Run all unit tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run E2E tests (requires dev server running)
npm run test:e2e

# Run specific test file
npm test -- tests/unit/example.test.ts
```

**Current Test Status:**
- ✅ 111 unit tests passing (10 test suites)
- ✅ 25 integration tests (skipped - require actual operations)
- ✅ Coverage thresholds enforced (70% minimum)
- ✅ Test Runner service operational

**How Testing Works:**

The Test Runner service (`src/lib/code-modification/test-runner.ts`) orchestrates all tests:
1. Runs unit tests with Jest
2. Runs integration tests for API endpoints
3. Optionally runs E2E tests with Playwright
4. Collects code coverage metrics
5. **Blocks deployments if tests fail** (CRITICAL for safety)

Example usage in code:
```typescript
import { validateTests } from '@/lib/code-modification/test-runner';

// This will throw an error if tests fail
await validateTests();
```

See `staging/tests/README.md` for detailed testing documentation.

### Testing the AI Agent API

**The API is fully operational!** 🚀

```bash
cd staging

# Start the server (if not already running)
npm run dev  # http://localhost:3000

# Test the API
npx ts-node test-api.ts "Add a comment to src/app/page.tsx"

# Try more complex requests
npx ts-node test-api.ts "Create a Button component"
npx ts-node test-api.ts "Add a bio field to User model"
npx ts-node test-api.ts "Change the homepage title to DeboraAI Dashboard"
```

**What the API does:**
1. Receives your natural language request
2. Claude 3.5 Sonnet generates code
3. Validates TypeScript/JSX syntax
4. Applies changes safely with backups
5. Creates git commit with AI co-author
6. Runs tests (optional)
7. Returns results in ~8-10 seconds

**Example Success Response:**
```json
{
  "success": true,
  "data": {
    "modifications": [{ "filePath": "src/app/page.tsx", "created": false }],
    "explanation": "Added comment at the top...",
    "commit": { "hash": "3a231f7", "message": "..." },
    "tests": { "passed": 111, "failed": 0, "total": 111 },
    "duration": 8617
  }
}
```

See `API_GUIDE.md` for complete API documentation and examples.

### Test Credentials
**Admin:**
- Email: `admin@deboraai.local`
- Password: `admin123`

**Customer:**
- Email: `customer@test.com`
- Password: `customer123`

---

## Next Steps to Continue Implementation

### Option 1: Continue with Full Implementation (Recommended)

Follow the phases in order from `IMPLEMENTATION_STATUS.md`:

**Next:** Phase 4 - Code Modification Engine (~14-16 hours)
```bash
cd staging/src/lib/code-modification

# 1. Create protected files list
# Create protected-files.ts (files agent can't modify)

# 2. Build FileManager
# Create file-manager.ts (safe file operations with validation)

# 3. Build Validator
# Create validator.ts (TypeScript, JSON, Prisma validation)

# 4. Build GitManager
# Create git-manager.ts (commit, merge, rollback operations)

# 5. Build MigrationManager
# Create migration-manager.ts (handle database schema changes)
```

Then proceed to:
- Phase 5: Bedrock Integration (~12-14 hours) - **CRITICAL**

### Option 2: Jump to Core Functionality (Faster)

To get a working prototype faster, skip to Phases 4-5:

**Phase 4:** Build the code modification engine:
```bash
cd staging/src/lib/code-modification

# Create these files:
# - protected-files.ts (list of files agent can't touch)
# - file-manager.ts (safe file operations)
# - validator.ts (validate generated code)
# - git-manager.ts (git operations)
# - migration-manager.ts (handle Prisma migrations)
```

**Phase 5:** Integrate AWS Bedrock:
```bash
# FIRST: Add AWS credentials to .env.local files!
# Edit staging/.env.local and production/.env.local:
AWS_ACCESS_KEY_ID=your_actual_key
AWS_SECRET_ACCESS_KEY=your_actual_secret
AWS_REGION=us-east-1

# Then create:
cd staging/src/lib/agents
# - codebase-context.ts (scans codebase for agent)
# - coding-agent.ts (Bedrock integration)

cd staging/src/app/api/code
# - modify/route.ts (main orchestrator)
```

At this point, you can test the core loop (even without UI):
```bash
# Make API request to /api/code/modify
curl -X POST http://localhost:3000/api/code/modify \
  -H "Content-Type: application/json" \
  -d '{"message": "Change the homepage title to Hello World"}'
```

### Option 3: Simplified MVP (~40-60 hours)

Already complete:
- ✅ **Testing infrastructure** (DONE - prevents broken deployments)

Skip these for a faster MVP:
- ❌ SSE live updates (use manual refresh instead)
- ❌ PM2 auto-restart (restart servers manually)
- ❌ Fancy UI (basic chat interface only)
- ❌ Customer pages (admin-only initially)

Focus on:
- ⏳ Code modification engine (NEXT - core safety layer)
- ⏳ Bedrock integration (AI brain)
- ⏳ Basic admin chat UI
- ⏳ Staging/production promotion

---

## Critical Prerequisites

### Before Phase 5 (Bedrock Integration)

**You MUST add AWS credentials:**

1. Edit `staging/.env.local`:
```env
AWS_ACCESS_KEY_ID=AKIA... # Your actual key
AWS_SECRET_ACCESS_KEY=... # Your actual secret
AWS_REGION=us-east-1
```

2. Edit `production/.env.local`:
```env
AWS_ACCESS_KEY_ID=AKIA... # Same key
AWS_SECRET_ACCESS_KEY=... # Same secret
AWS_REGION=us-east-1
```

3. Verify AWS Bedrock access:
```bash
# Test with AWS CLI (if installed)
aws bedrock list-foundation-models --region us-east-1

# Should see Claude models available
```

---

## Troubleshooting

### Git Worktrees Not Working
```bash
cd /Users/davcasd/research/DeboraAI
cd staging && git worktree list
cd ../production && git worktree list
```

Should show both worktrees. If not, they may have been corrupted.

### Database Not Found
```bash
cd staging
ls -la prisma/*.db

# If missing:
npx prisma migrate dev --name init
npx prisma db seed
```

### Ports Already in Use
```bash
# Kill processes on port 3000 or 3001
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Dependencies Out of Sync
```bash
cd staging
rm -rf node_modules package-lock.json
npm install

cd ../production
rm -rf node_modules package-lock.json
npm install
```

### Tests Failing
```bash
cd staging

# Clear Jest cache
npm test -- --clearCache

# Run tests in verbose mode to see details
npm test -- --verbose

# Run a specific test file to isolate issues
npm test -- tests/unit/example.test.ts

# Check coverage report
npm run test:coverage
# Open coverage/index.html in browser for detailed report
```

### E2E Tests Timing Out
```bash
# Make sure dev server is running first
npm run dev  # In one terminal

# Then run E2E tests in another terminal
npm run test:e2e

# Or increase timeout in playwright.config.ts
```

---

## Development Workflow

### Making Changes

**Always work in staging first:**
```bash
cd staging

# 1. Create feature on staging branch
git checkout staging
# Make changes to files

# 2. Run tests BEFORE committing
npm test                    # Unit tests
npm run test:coverage      # Check coverage
# All tests must pass before deployment!

# 3. Commit changes
git add .
git commit -m "Add feature X"

# 4. Test in staging
npm run dev  # Test on localhost:3000

# 5. If good, promote to production
cd ../production
git merge staging
npm run dev  # Test on localhost:3001
```

**IMPORTANT:** The Test Runner will automatically block deployments if tests fail. This is a critical safety feature that prevents broken code from reaching staging or production.

### When Things Break

**Rollback in staging:**
```bash
cd staging
git log                 # Find commit to revert
git revert <commit-hash>
```

**Don't break production:**
- Always test thoroughly in staging first
- Never commit directly to main branch
- Use staging → main merges only

---

## Project Goals Reminder

**End Goal:** A non-technical admin (your mother, a lawyer) can:
1. Open browser to `localhost:3000/admin/code`
2. Type: "Add a document upload feature for clients"
3. AI agent generates: database model + API + UI
4. Changes appear instantly in staging
5. She tests it, then clicks "Promote to Production"
6. Customers see the new feature on `localhost:3001`

**Core Innovation:** The application modifies its own source code through AI direction.

---

## Resources

- **Implementation Plan:** See original plan document
- **Status Tracker:** `IMPLEMENTATION_STATUS.md`
- **Architecture Diagram:** See plan for full system diagram
- **Test Scenarios:** See plan Phase 9 for verification tests

---

## Estimated Timeline to MVP

**Already Complete (11 hours):**
- ✅ Phase 1: Project Foundation
- ✅ Phase 2: Database & Authentication
- ✅ Phase 3: Testing Infrastructure

**Minimum Viable Product (Core Functionality Remaining):**
- Phase 4 (Code Engine): 14-16 hours
- Phase 5 (Bedrock): 12-14 hours
- Phase 6 (Basic Admin UI): 8-10 hours
- Phase 8 (Promotion API): 4-6 hours
**Total Remaining:** ~38-46 hours

**Full Prototype (All Features):**
- Remaining phases: ~106-136 hours
- Working 8 hours/day: 13-17 days
- Working 4 hours/day: 27-34 days

---

## Questions?

Refer to:
- `IMPLEMENTATION_STATUS.md` - Comprehensive phase breakdown
- Original implementation plan - Full architecture details
- `/Users/davcasd/.claude/projects/.../transcript.jsonl` - Full conversation history

---

## Let's Build This! 🚀

**Current Status:** Testing infrastructure complete! 🎉

The next critical step is **Phase 4: Code Modification Engine** - this is the core safety layer that:
- Prevents the agent from modifying protected files (auth, middleware)
- Validates all code changes before applying them
- Manages git operations (commit, merge, rollback)
- Handles database migrations safely

After Phase 4, you'll move to Phase 5 (Bedrock Integration) and have a working MVP!

Good luck with the implementation!
