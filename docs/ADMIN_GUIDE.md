# DeboraAI Administrator Guide

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Accessing the Admin Interface](#accessing-the-admin-interface)
4. [Making Code Modifications](#making-code-modifications)
5. [Understanding the AI Workflow](#understanding-the-ai-workflow)
6. [Safety Mechanisms](#safety-mechanisms)
7. [Viewing Change History](#viewing-change-history)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

DeboraAI is a self-modifying web application powered by AI. As an administrator, you can request code changes using natural language, and the AI agent will autonomously implement them in the **staging environment**. All changes are version-controlled, tested, and can be reviewed before going live.

### Key Concepts

- **Staging Environment**: Where the AI makes changes. Safe sandbox for testing modifications.
- **Production Environment**: The live application (not yet accessible to the AI).
- **Admin Interface**: Web-based chat UI for requesting code changes.
- **AI Agent**: Claude 3.5 Sonnet via AWS Bedrock, using the Agent SDK to modify files directly.
- **Test-Driven Deployment**: All changes are automatically tested; failures result in automatic rollback.

---

## Architecture

### Git Worktrees

DeboraAI uses Git worktrees to maintain two separate working directories:

```
/Users/davcasd/research/DeboraAI/
├── staging/          # AI modifies files here
│   └── src/
│   └── tests/
│   └── ...
└── production/       # Production branch (future deployment target)
    └── src/
    └── ...
```

**Important:** Both directories share the same Git repository but track different branches. Changes in staging do NOT automatically appear in production.

### Directory Structure (Staging)

```
staging/
├── src/
│   ├── app/                    # Next.js pages and API routes
│   │   ├── page.tsx           # Homepage
│   │   ├── admin/             # Admin-only pages
│   │   │   ├── code/          # AI modification interface
│   │   │   └── history/       # Change history viewer
│   │   └── api/               # Backend endpoints
│   │       ├── code/          # Code modification API
│   │       └── sse/           # Real-time updates endpoint
│   ├── components/            # React components
│   │   └── admin/             # Admin UI components
│   ├── lib/                   # Core libraries
│   │   ├── agents/            # AI agent implementation
│   │   ├── code-modification/ # Code modification utilities
│   │   └── sse/               # Server-Sent Events
│   └── hooks/                 # React hooks
├── tests/                     # Automated tests
│   ├── unit/                  # Unit tests
│   └── integration/           # Integration tests
├── prisma/                    # Database schema
└── docs/                      # Documentation
```

---

## Accessing the Admin Interface

### Starting the Development Server

1. **Open a terminal** (NOT the one running Claude Code)
2. **Navigate to staging directory:**
   ```bash
   cd ~/research/DeboraAI/staging
   ```
3. **Start the server:**
   ```bash
   npm run dev
   ```
4. **Open browser to:**
   ```
   http://localhost:3000/admin/code
   ```

### Admin Pages

| URL | Purpose |
|-----|---------|
| `/admin/code` | Main AI modification interface (chat) |
| `/admin/history` | View all code changes with git commits |
| `/` | Homepage (preview staging site) |

---

## Making Code Modifications

### The Chat Interface

The admin interface at `/admin/code` is a conversational chat where you request code changes in natural language.

#### Connection Status

Look for the status indicator in the header:
- **🟢 Live** - Real-time updates connected
- **⚪ Connecting...** - SSE connection establishing

#### Making a Request

1. **Type your request** in the text area at the bottom
2. **Be specific** about what you want changed
3. **Click "Send"** or press Enter
4. **Watch real-time progress** as the AI works

#### Example Requests

**Good requests (clear and specific):**
```
"Add a dark mode toggle to the homepage header"
"Create a contact form with name, email, and message fields"
"Update the homepage hero section with a larger title"
"Add error handling to the login form"
"Fix the typo in the about page title"
```

**Requests to avoid (too vague):**
```
"Make it better"
"Fix everything"
"Add features"
```

### Understanding the Response

The AI will respond with:

1. **Progress messages** (in blue boxes):
   - "Initializing services..."
   - "Claude Agent is analyzing and modifying files..."
   - "File modified: src/app/page.tsx"
   - "Running automated tests..."

2. **Final response** (in gray box):
   - Summary of changes made
   - Explanation of what was done

3. **Metadata** (at bottom of message):
   - Files modified (with • or + prefix)
   - Git commit hash
   - Test results (X/Y passed)
   - Duration

### Conversation Continuity

The AI maintains conversation context across multiple requests:

- **Follow-up requests:** "Now add a submit button"
- **Refinements:** "Actually, make that button blue instead"
- **Clarifications:** The AI can ask questions if unclear

To start fresh, click the **"Clear"** button in the header.

---

## Understanding the AI Workflow

When you send a request, the AI executes a 5-step workflow:

### Step 1: Initialize Services
- Sets up Git manager, migration manager, and AI agent
- Takes a snapshot of current file state
- **Progress:** "Initializing services..."

### Step 2: AI Agent Modifies Files
- Claude Agent SDK analyzes your request
- Reads existing files to understand context
- Directly edits, creates, or deletes files as needed
- **Progress:** "Claude Agent is analyzing and modifying files..."
- **You'll see:** File change notifications for each modified file

### Step 3: Handle Database Migrations
- Checks if `prisma/schema.prisma` was modified
- If yes: Generates and applies database migration
- If no: Skips this step
- **Progress:** "Generating database migration..." or "No database schema changes"

### Step 4: Create Git Commit
- Stages all modified files
- Creates commit with descriptive message
- Includes your request in commit message
- **Progress:** "Creating git commit..."
- **You'll see:** Short commit hash (e.g., `a1b2c3d`)

### Step 5: Run Automated Tests
- Runs unit tests (tests/unit/)
- Runs integration tests (tests/integration/)
- Skips E2E tests (too slow for real-time feedback)
- **Progress:** "Running automated tests..."
- **You'll see:** Test results (e.g., "120/120 passed")

### If Tests Fail

**Automatic rollback occurs:**
1. Git commit is reverted
2. Files return to pre-modification state
3. Error message explains what failed
4. You can refine your request and try again

---

## Safety Mechanisms

### Protected Files

The AI **CANNOT** modify certain critical files:

#### Authentication & Security
```
src/lib/auth.ts
src/middleware.ts
src/app/api/auth/**
```

#### AI Agent Code (self-protection)
```
src/lib/code-modification/**
src/lib/agents/**
```

#### Configuration Files
```
.env*
package.json
tsconfig.json
next.config.ts
jest.config.*
playwright.config.*
```

#### Git Files
```
.git/**
.gitignore
```

**If you need to modify protected files:** Do it manually via code editor or git commands.

### Sensitive Files (Extra Caution)

The AI CAN modify these but exercises extra care:

```
prisma/schema.prisma       # Database schema
src/app/layout.tsx         # Root layout
src/lib/**                 # Core libraries
```

The AI will only modify these if explicitly requested.

### Test-Driven Deployment

Every code change triggers automated tests:

1. **120 unit and integration tests** run automatically
2. **Tests must pass** for changes to persist
3. **If tests fail:** Automatic rollback to previous state
4. **No broken code** reaches staging

This ensures stability and prevents accidental breakage.

### Git Tracking

Every change is tracked in Git:

- Each modification creates a commit
- Commit messages include your request
- Co-authored with "Claude Agent SDK"
- Full history available via `git log`

**To revert a change manually:**
```bash
cd ~/research/DeboraAI/staging
git log                          # Find commit hash
git revert <commit-hash>         # Revert specific commit
```

---

## Viewing Change History

### Web Interface

Visit `/admin/history` to see:

- **All commits** made by the AI agent
- **File changes** in each commit
- **Commit messages** with original requests
- **Timestamps** and authors

### Command Line

```bash
cd ~/research/DeboraAI/staging

# View recent commits
git log --oneline -20

# View detailed commit info
git show <commit-hash>

# View changes to specific file
git log -p src/app/page.tsx

# Search commits by message
git log --grep="dark mode"
```

---

## Best Practices

### Making Effective Requests

#### 1. Be Specific
**Good:** "Add a logout button to the top-right corner of the header"
**Bad:** "Add logout functionality"

#### 2. One Feature at a Time
**Good:** "Add a contact form with name, email, and message fields"
**Better:** Split into steps:
- "Add a contact form with name and email fields"
- "Add a message textarea to the contact form"
- "Add form validation to the contact form"

#### 3. Provide Context
**Good:** "Update the hero section on the homepage to use a larger font (text-5xl)"
**Bad:** "Make the text bigger"

#### 4. Specify Styling Details
**Good:** "Add a blue (bg-blue-600) submit button with white text and rounded corners"
**Bad:** "Add a submit button"

### Working with the AI

#### Start Small
- Begin with simple requests to understand how the AI works
- Build complexity gradually
- Test frequently

#### Iterate Incrementally
- Request → Review → Refine → Repeat
- Don't try to build entire features in one request
- Use follow-up requests to adjust

#### Use Conversation Context
The AI remembers previous requests in the session:
- "Now add a submit button to that form"
- "Change the button color to green"
- "Add hover effects to all buttons we just created"

#### Review Changes
After each modification:
1. Check the files that were modified
2. View the result in the browser
3. Verify tests passed
4. Look at the git commit

### When to Clear Conversation

Click "Clear" to start a fresh conversation when:
- Switching to a completely different feature
- The AI seems confused by context
- You want to start over with a different approach

**Note:** Clearing conversation does NOT undo code changes. Use git revert for that.

---

## Troubleshooting

### "AI agent is working..." Never Completes

**Causes:**
- Server crashed or timed out
- Network connection lost
- API rate limit reached

**Solutions:**
1. Check the terminal for error messages
2. Refresh the page
3. Check server is still running (`npm run dev`)
4. Wait a few minutes and try again

### "Tests failed - changes have been rolled back"

**What happened:**
- The AI's changes broke existing functionality
- Automated tests caught the issue
- Changes were automatically reverted

**Next steps:**
1. Read the error message for details
2. Refine your request to be more specific
3. Try a smaller, simpler version of your request
4. Check if related files need updates too

### Real-Time Updates Not Showing

**Check:**
1. **Connection status:** Look for green "Live" indicator
2. **Browser console:** Press F12, check for errors
3. **Network tab:** Verify `/api/sse` connection is open

**Solutions:**
1. Refresh the page
2. Clear browser cache
3. Restart dev server

### "Error: Claude Code process exited with code 1"

**Cause:** Environment variable issue in terminal

**Solution:**
1. Stop dev server (Ctrl+C)
2. Open a FRESH terminal window
3. Navigate to staging: `cd ~/research/DeboraAI/staging`
4. Verify: `echo $CLAUDECODE` (should be empty)
5. Start server: `npm run dev`

### Changes Not Appearing in Browser

**Check:**
1. Did tests pass? (Look at response message)
2. Is dev server running? (Check terminal)
3. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

**Solutions:**
1. Check the files were actually modified: `git status`
2. Verify commit was created: `git log -1`
3. Restart dev server

### AI Refuses to Modify a File

**Cause:** File is in the protected list

**Protected files:**
- Authentication code
- AI agent code
- Configuration files

**Solution:** Modify these files manually using a code editor

### Server Won't Start (Port Already in Use)

**Error:** "Port 3000 is already in use"

**Solutions:**
1. Find process: `lsof -i :3000`
2. Kill process: `kill -9 <PID>`
3. Or use different port: `PORT=3001 npm run dev`

### Git Conflicts

**Cause:** Manual changes conflict with AI changes

**Solutions:**
```bash
# Check status
git status

# View conflicts
git diff

# Resolve manually, then:
git add .
git commit -m "Resolve conflicts"
```

---

## Quick Reference

### Common Commands

```bash
# Start staging server
cd ~/research/DeboraAI/staging
npm run dev

# View recent changes
git log --oneline -10

# Check what files were modified
git status

# View specific commit
git show <commit-hash>

# Revert a change
git revert <commit-hash>

# Run tests manually
npm test

# Check for errors
npm run lint
```

### Admin URLs

| URL | Purpose |
|-----|---------|
| `http://localhost:3000` | Staging homepage |
| `http://localhost:3000/admin/code` | AI modification interface |
| `http://localhost:3000/admin/history` | Change history |

### File Naming Conventions

| Type | Location | Naming Pattern |
|------|----------|----------------|
| Pages | `src/app/*/page.tsx` | `page.tsx` |
| API Routes | `src/app/api/*/route.ts` | `route.ts` |
| Components | `src/components/` | `PascalCase.tsx` |
| Utilities | `src/lib/` | `kebab-case.ts` |
| Tests | `tests/unit/` or `tests/integration/` | `*.test.ts` |

### Status Indicators

| Indicator | Meaning |
|-----------|---------|
| 🟢 Live | Real-time updates connected |
| ⚪ Connecting... | Establishing SSE connection |
| • file.tsx | File modified |
| + file.tsx | File created (new) |
| ✓ 120/120 passed | All tests passed |
| ✗ 5/120 failed | Tests failed, changes rolled back |

---

## Support

### Viewing Logs

**Browser logs:**
1. Press F12 to open Developer Tools
2. Click "Console" tab
3. Look for `[SSE]` messages

**Server logs:**
- Check the terminal running `npm run dev`
- Look for error stack traces
- Check `[SSE Broadcast]` messages

### Getting Help

For issues not covered in this guide:

1. **Check git history:** `git log` to see what changed
2. **Review commit:** `git show <hash>` for details
3. **Check tests:** `npm test` to verify system health
4. **Restart fresh:** Stop server, clear conversation, restart

---

## Appendix: Technical Details

### Technology Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **AI Model:** Claude 3.5 Sonnet (via AWS Bedrock)
- **Agent SDK:** @anthropic-ai/claude-agent-sdk
- **Real-Time:** Server-Sent Events (SSE)
- **Testing:** Jest (unit/integration)
- **Database:** Prisma + SQLite
- **Version Control:** Git worktrees

### Environment Variables

Located in `staging/.env.local`:

```bash
# AWS Bedrock (AI API)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=***
AWS_SECRET_ACCESS_KEY=***
CLAUDE_CODE_USE_BEDROCK=1

# Development
NODE_ENV=development
PORT=3000

# Worktree paths
WORKTREE_TYPE=staging
STAGING_PATH=/Users/davcasd/research/DeboraAI/staging
PRODUCTION_PATH=/Users/davcasd/research/DeboraAI/production
```

**⚠️ Never commit `.env.local` to git** - it contains secrets!

### Request/Response Flow

```
User → Chat UI → /api/code/modify → Claude Agent SDK
                                            ↓
                                      Modifies Files
                                            ↓
                                     Git Commit
                                            ↓
                                      Run Tests
                                            ↓
                                   ✓ Pass → Keep Changes
                                   ✗ Fail → Rollback
                                            ↓
                                    Response → UI
```

### SSE Message Types

| Type | Purpose | Data |
|------|---------|------|
| `connected` | Initial connection | `{ clientId, sessionId }` |
| `heartbeat` | Keep connection alive | `{ time }` |
| `progress` | Step-by-step updates | `{ message }` |
| `status` | Step completion | `{ status, details }` |
| `file_change` | File modified/created | `{ filePath, action }` |
| `test_result` | Test results | `{ passed, failed, total }` |
| `error` | Error occurred | `{ error }` |
| `complete` | Request finished | `{ success, modifications, duration }` |

---

**Last Updated:** February 14, 2026
**Version:** 1.0 (Phase 7 Complete)
