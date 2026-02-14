# DeboraAI Conventions & Terminology

This document defines the shared vocabulary and conventions used by administrators and the AI coding agent.

---

## Environments

| Term | Description | AI Access |
|------|-------------|-----------|
| **Staging** | Development/testing environment where AI makes changes | ✅ Full access |
| **Production** | Live application serving end users | ❌ No access (yet) |

**Location:**
- Staging: `/Users/davcasd/research/DeboraAI/staging/`
- Production: `/Users/davcasd/research/DeboraAI/production/`

---

## Admin Pages & URLs

| URL | Name | Purpose |
|-----|------|---------|
| `/admin/code` | Admin Interface / AI Modification Interface | Main chat UI for requesting code changes |
| `/admin/history` | Change History | View all code changes and git commits |
| `/` | Homepage | Preview staging site |

**Port:** Default is `http://localhost:3000` in development

---

## File Naming Conventions

| Type | Location | Pattern | Example |
|------|----------|---------|---------|
| **Page** | `src/app/*/` | `page.tsx` | `src/app/admin/code/page.tsx` |
| **API Route** | `src/app/api/*/` | `route.ts` | `src/app/api/code/modify/route.ts` |
| **Component** | `src/components/` | `PascalCase.tsx` | `ChatInterface.tsx` |
| **Library/Utility** | `src/lib/` | `kebab-case.ts` | `git-manager.ts` |
| **Test** | `tests/unit/` or `tests/integration/` | `*.test.ts` | `bedrock-client.test.ts` |

---

## Status Indicators

| Symbol | Meaning | Context |
|--------|---------|---------|
| `•` | File modified | Existing file was changed |
| `+` | File created | New file was added |
| `✓` | Tests passed | All automated tests succeeded |
| `✗` | Tests failed | Tests failed, changes rolled back |
| `🟢 Live` | SSE connected | Real-time updates active |
| `⚪ Connecting...` | SSE connecting | Establishing connection |

---

## Directory Structure Conventions

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Homepage (route: /)
│   ├── layout.tsx         # Root layout
│   ├── admin/             # Admin-only pages
│   │   ├── code/          # AI modification interface
│   │   │   └── page.tsx   # Route: /admin/code
│   │   └── history/       # Change history viewer
│   │       └── page.tsx   # Route: /admin/history
│   └── api/               # API endpoints
│       ├── code/          # Code modification endpoints
│       │   ├── modify/    # POST /api/code/modify
│       │   └── history/   # GET /api/code/history
│       └── sse/           # Server-Sent Events
│           └── route.ts   # GET /api/sse
├── components/            # React components
│   └── admin/             # Admin-specific components
├── lib/                   # Core libraries
│   ├── agents/            # AI agent implementation
│   ├── code-modification/ # Code modification utilities
│   └── sse/               # Server-Sent Events manager
├── hooks/                 # React hooks (e.g., useSSE)
└── middleware.ts          # Next.js middleware

tests/
├── unit/                  # Unit tests (fast, isolated)
└── integration/           # Integration tests (realistic scenarios)

docs/
├── ADMIN_GUIDE.md         # Full administrator documentation
└── CONVENTIONS.md         # This file
```

---

## Terminology

### Request Types

| Term | Meaning |
|------|---------|
| **Code modification** | A request to change the codebase |
| **Modification request** | Same as above |
| **AI request** | Administrator asking AI to make changes |

### Workflow Terms

| Term | Meaning |
|------|---------|
| **5-step workflow** | The process AI follows: Initialize → Modify → Migrate → Commit → Test |
| **Test-driven deployment** | Changes must pass tests or get rolled back |
| **Automatic rollback** | Reverting changes when tests fail |
| **Conversation continuity** | AI remembers context across multiple requests in a session |
| **Session** | A series of related requests in the same conversation |

### Change Tracking

| Term | Meaning |
|------|---------|
| **Git commit** | Saved snapshot of changes |
| **Commit hash** | Unique identifier for a commit (e.g., `a1b2c3d`) |
| **Staged changes** | Files ready to be committed |
| **Protected files** | Files AI cannot modify (auth, config, AI's own code) |
| **Sensitive files** | Files requiring extra caution (schema, core libs) |

---

## AI Agent Workflow (5 Steps)

When an administrator makes a request, the AI executes this workflow:

1. **Initialize Services** (Step 1/5)
   - Sets up Git, database, and AI agent
   - Takes snapshot of current state

2. **AI Agent Modifies Files** (Step 2/5)
   - Claude Agent SDK analyzes request
   - Reads existing files
   - Edits, creates, or deletes files

3. **Handle Database Migrations** (Step 3/5)
   - Checks if `prisma/schema.prisma` changed
   - Generates migration if needed
   - Applies to database

4. **Create Git Commit** (Step 4/5)
   - Stages all modified files
   - Creates commit with descriptive message
   - Includes admin request in message

5. **Run Automated Tests** (Step 5/5)
   - Runs unit and integration tests
   - If pass: Changes persist
   - If fail: Automatic rollback

---

## Protected Files (Cannot Be Modified by AI)

The AI **CANNOT** modify these critical files:

### Authentication & Security
- `src/lib/auth.ts`
- `src/middleware.ts`
- `src/app/api/auth/**`

### AI Agent Code (Self-Protection)
- `src/lib/code-modification/**`
- `src/lib/agents/**`

### Configuration
- `.env*`
- `package.json`
- `tsconfig.json`
- `next.config.ts`
- `jest.config.*`
- `playwright.config.*`

### Git Files
- `.git/**`
- `.gitignore`

**To modify protected files:** Do it manually via code editor or git commands.

---

## Sensitive Files (Require Extra Care)

The AI **CAN** modify these but exercises extra caution:

- `prisma/schema.prisma` - Database schema
- `src/app/layout.tsx` - Root layout
- `src/lib/**` - Core libraries

---

## Request Communication Style

### Good Request Examples

```
"Add a dark mode toggle to the homepage header"
"Create a contact form with name, email, and message fields"
"Update the hero section on the homepage to use text-5xl"
"Add error handling to the login form validation"
```

### Request Best Practices

1. **Be specific** - "Add a blue button" not "add a button"
2. **Include details** - "Use bg-blue-600 and text-white"
3. **One feature at a time** - Break complex changes into steps
4. **Provide context** - "In the header component" not just "add logout"

### Follow-Up Requests

The AI maintains context, so you can say:
- "Now add a submit button to that form"
- "Change the button color to green"
- "Add hover effects to all buttons we just created"

---

## SSE (Server-Sent Events) Message Types

Real-time progress updates use these message types:

| Type | Purpose | Example Data |
|------|---------|--------------|
| `connected` | Initial connection established | `{ clientId, sessionId }` |
| `heartbeat` | Keep connection alive | `{ time }` |
| `progress` | Step-by-step update | `{ message: "Initializing..." }` |
| `status` | Step completion | `{ status: "initialized", details }` |
| `file_change` | File modified/created | `{ filePath, action }` |
| `test_result` | Test results | `{ passed, failed, total }` |
| `error` | Error occurred | `{ error: "..." }` |
| `complete` | Request finished | `{ success, modifications, duration }` |

---

## Quick Reference Commands

```bash
# Start staging server
cd ~/research/DeboraAI/staging
npm run dev

# View recent commits
git log --oneline -10

# Check modified files
git status

# View specific commit
git show <commit-hash>

# Revert a change
git revert <commit-hash>

# Run tests manually
npm test
```

---

**Related Documentation:**
- [Administrator Guide](./ADMIN_GUIDE.md) - Complete guide for admins
- [README.md](../README.md) - Project overview

**Last Updated:** February 14, 2026
**Version:** 1.0 (Phase 7 Complete)
