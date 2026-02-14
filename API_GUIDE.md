# DeboraAI API Guide

Complete guide for using the DeboraAI code modification API.

---

## Quick Start

### Prerequisites

1. **Staging server running:**
   ```bash
   cd staging
   npm run dev  # http://localhost:3000
   ```

2. **AWS credentials configured** in `staging/.env.local`:
   ```env
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   AWS_REGION=us-east-1
   ```

### Your First Request

```bash
cd staging
npx ts-node test-api.ts "Add a comment to src/app/page.tsx"
```

**What happens:**
1. Claude 3.5 Sonnet generates the code
2. TypeScript validation checks syntax
3. Changes applied to staging
4. Git commit created
5. Results returned in ~8-10 seconds

---

## API Endpoint

### POST /api/code/modify

Modifies application code based on natural language requests.

**URL:** `http://localhost:3000/api/code/modify`

**Method:** `POST`

**Content-Type:** `application/json`

---

## Request Format

```typescript
{
  "message": string,              // Required: User request in natural language
  "conversationHistory": array,   // Optional: Previous chat messages
  "skipTests": boolean            // Optional: Skip automated tests (dev only)
}
```

### Parameters

**`message`** (required)
- Type: `string`
- The natural language request describing what code changes to make
- Examples:
  - "Add a dark mode toggle"
  - "Create a new Task model with title and description fields"
  - "Add a bio field to the User model"

**`conversationHistory`** (optional)
- Type: `array`
- Previous conversation messages for context
- Format: `[{ role: 'user'|'assistant', content: string }, ...]`
- Useful for follow-up requests

**`skipTests`** (optional)
- Type: `boolean`
- Default: `false`
- Skip automated test execution (faster feedback during development)
- **WARNING:** Only use during development - production should always test!

---

## Response Format

### Success Response

**HTTP Status:** `200 OK`

```json
{
  "success": true,
  "message": "Code modifications applied successfully",
  "data": {
    "modifications": [
      {
        "filePath": "src/app/page.tsx",
        "created": false
      }
    ],
    "explanation": "Added the requested comment at the top of src/app/page.tsx while preserving existing functionality.",
    "thinking": "This is a simple modification to add a comment...",
    "warnings": [
      "src/app/page.tsx is marked as a sensitive file..."
    ],
    "commit": {
      "hash": "3a231f7",
      "message": "AI: Add comment to page\n\nExplanation...\n\nCo-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
    },
    "tests": {
      "passed": 111,
      "failed": 0,
      "total": 111,
      "duration": 1234
    },
    "duration": 8617
  }
}
```

### Error Response

**HTTP Status:** `400 Bad Request` or `500 Internal Server Error`

```json
{
  "success": false,
  "error": "Error message here",
  "details": "Additional error details..."
}
```

### Response Fields

**`success`**: `boolean`
- Whether the operation succeeded

**`data.modifications`**: `array`
- List of files that were modified
- Each entry has `filePath` and `created` flag

**`data.explanation`**: `string`
- Human-readable explanation of what was changed

**`data.thinking`**: `string`
- Claude's internal reasoning about the implementation

**`data.warnings`**: `array` (optional)
- Any warnings about the changes

**`data.commit`**: `object`
- Git commit information
- `hash`: Commit SHA
- `message`: Full commit message

**`data.tests`**: `object`
- Test results if tests were run
- `passed`, `failed`, `total`, `duration`
- `skipped: true` if tests were skipped

**`data.duration`**: `number`
- Total time in milliseconds

---

## Example Requests

### 1. Simple Modification

Add a comment to an existing file:

```bash
curl -X POST http://localhost:3000/api/code/modify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Add a comment at the top of src/app/page.tsx that says // Hello World"
  }'
```

**Response Time:** ~8 seconds

---

### 2. Create New Component

```bash
curl -X POST http://localhost:3000/api/code/modify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a Button component in src/components/Button.tsx with primary and secondary variants"
  }'
```

**Response Time:** ~10-15 seconds

---

### 3. Database Model Change

```bash
curl -X POST http://localhost:3000/api/code/modify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Add a bio field to the User model in the Prisma schema"
  }'
```

**What happens:**
1. Modifies `prisma/schema.prisma`
2. Generates Prisma migration
3. Applies migration to database
4. Regenerates Prisma client
5. Creates git commit

**Response Time:** ~15-20 seconds

---

### 4. Multi-File Feature

```bash
curl -X POST http://localhost:3000/api/code/modify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Add a Task feature with database model, API endpoint to create tasks, and a simple task list component"
  }'
```

**What happens:**
1. Modifies `prisma/schema.prisma` (Task model)
2. Creates `src/app/api/tasks/route.ts` (API)
3. Creates `src/components/TaskList.tsx` (UI)
4. Generates migrations
5. Creates git commit

**Response Time:** ~20-30 seconds

---

### 5. Skip Tests (Development)

```bash
curl -X POST http://localhost:3000/api/code/modify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Change the homepage title to DeboraAI Dashboard",
    "skipTests": true
  }'
```

**Faster Response:** ~8 seconds (no test execution)

---

### 6. With Conversation History

```bash
curl -X POST http://localhost:3000/api/code/modify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Make it red instead",
    "conversationHistory": [
      {
        "role": "user",
        "content": "Add a dark mode toggle button"
      },
      {
        "role": "assistant",
        "content": "I added a dark mode toggle with a blue background..."
      }
    ]
  }'
```

Claude understands "it" refers to the dark mode toggle from previous conversation.

---

## Using the Test Script

### Basic Usage

```bash
cd staging
npx ts-node test-api.ts "Your request here"
```

### Examples

```bash
# Simple change
npx ts-node test-api.ts "Add a comment to page.tsx"

# New component
npx ts-node test-api.ts "Create a Card component"

# Database change
npx ts-node test-api.ts "Add completed field to Task model"

# Feature
npx ts-node test-api.ts "Add user authentication flow"
```

### Script Options

The script automatically:
- Sets `skipTests: true` for faster feedback
- Formats output nicely
- Shows commit hash
- Lists modified files

---

## Request Patterns

### Best Practices

**✅ Good Requests:**
- Specific and clear: "Add a bio field to User model"
- Include context: "Create a Button component with primary and secondary variants"
- Mention files: "Update src/app/page.tsx to show user name"

**❌ Avoid:**
- Vague: "Make it better"
- Too broad: "Build an entire CRM system"
- Ambiguous: "Fix the bug" (which bug?)

### Request Types

**1. File Modifications**
```
"Add [something] to [file]"
"Update [file] to [do something]"
"Change [element] in [file] to [new value]"
```

**2. New Files**
```
"Create a [component/model/route] in [path]"
"Add a new [thing] at [location]"
```

**3. Database Changes**
```
"Add [field] to [model]"
"Create a [model] with [fields]"
"Update [model] schema to include [field]"
```

**4. Features**
```
"Add [feature] with [requirements]"
"Implement [functionality]"
"Build [component/system] that [does X]"
```

---

## Error Handling

### Common Errors

**1. Protected File**
```json
{
  "success": false,
  "error": "Cannot modify protected file: src/lib/auth.ts"
}
```

**What happened:** Attempted to modify a protected file (auth, config, agent code).

**Solution:** Don't try to modify protected files. They're protected for security.

---

**2. Validation Failed**
```json
{
  "success": false,
  "error": "Generated code failed validation",
  "details": [
    "src/app/page.tsx: error TS2304: Cannot find name 'foo'"
  ]
}
```

**What happened:** Generated code has TypeScript errors.

**Solution:** Claude generated invalid code. Try rephrasing request or providing more context.

---

**3. Tests Failed**
```json
{
  "success": false,
  "error": "Tests failed - changes have been rolled back",
  "testResults": {
    "passed": 105,
    "failed": 6,
    "total": 111,
    "errors": "..."
  }
}
```

**What happened:** Changes broke existing tests.

**Solution:** Changes were automatically rolled back. Fix the issue or skip tests during development.

---

**4. AWS Bedrock Error**
```json
{
  "success": false,
  "error": "The provided model identifier is invalid"
}
```

**What happened:** Wrong model ID or AWS credentials issue.

**Solution:** Check `.env.local` has correct AWS credentials.

---

## Advanced Usage

### Conversation Context

Build up context with multiple requests:

```typescript
// Request 1: Create component
const response1 = await fetch('/api/code/modify', {
  method: 'POST',
  body: JSON.stringify({
    message: "Create a Card component"
  })
});

// Request 2: Modify that component
const response2 = await fetch('/api/code/modify', {
  method: 'POST',
  body: JSON.stringify({
    message: "Add a shadow effect to the card",
    conversationHistory: [
      { role: 'user', content: "Create a Card component" },
      { role: 'assistant', content: response1.data.explanation }
    ]
  })
});
```

### Specific File Targeting

```typescript
{
  "message": "In src/components/Header.tsx, add a navigation link to /about"
}
```

Claude will focus on that specific file.

### Complex Features

```typescript
{
  "message": `
    Add a Task management feature:
    1. Database: Task model with title, description, completed, userId
    2. API: POST /api/tasks to create, GET /api/tasks to list
    3. UI: TaskList component showing all tasks
    4. UI: TaskForm component to create new tasks
  `
}
```

Claude can handle multi-step requirements.

---

## Performance Tips

### Faster Responses

1. **Skip tests during development:**
   ```json
   { "skipTests": true }
   ```

2. **Be specific:**
   - "Add comment to line 5 of src/app/page.tsx" (fast)
   - vs "Improve the homepage" (slower, needs analysis)

3. **Single file changes:**
   - Single file: ~8 seconds
   - Multiple files: ~15-25 seconds

### What Affects Speed

**Fastest (~8s):**
- Single file modification
- Simple changes (comments, text, styling)

**Medium (~12-18s):**
- New components
- API endpoints
- Multiple file changes

**Slowest (~20-30s):**
- Database schema changes (needs migrations)
- Complex features (DB + API + UI)
- With full test suite enabled

---

## Monitoring & Debugging

### Check Server Logs

The API logs detailed progress:

```bash
# Watch staging server logs
tail -f /path/to/staging/server.log
```

**Log Output:**
```
================================================================================
CODE MODIFICATION REQUEST
================================================================================
User request: Add a comment to src/app/page.tsx
--------------------------------------------------------------------------------

[Step 1/7] Initializing services...
✓ Services initialized

[Step 2/7] Generating code with Claude Sonnet 4.5...
✓ Generated 1 file modification(s)
Files to modify:
  - src/app/page.tsx

[Step 3/7] Validating generated code...
✓ All generated code is valid

[Step 4/7] Applying changes to files...
✓ Successfully modified 1 file(s)

[Step 5/7] Creating git commit...
✓ Committed as: 3a231f7

[Step 6/7] Running automated tests...
✓ All tests passed (111/111)

[Step 7/7] Code modification complete!
Total time: 8.62s
================================================================================
```

### Check Git History

```bash
cd staging
git log --oneline
```

Every API call creates a commit:
```
3a231f7 AI: Add comment to src/app/page.tsx
2b14a63 AI: Create Button component
1c05b52 AI: Add bio field to User model
```

### Revert Changes

```bash
# Revert last change
git revert HEAD

# Revert specific commit
git revert 3a231f7
```

---

## Production Deployment

### Current Status

- ✅ **Staging works:** Code modifications on localhost:3000
- ⏳ **Production promotion:** Phase 8 (not yet implemented)
- ⏳ **SSE notifications:** Phase 7 (not yet implemented)

### Future: Promote to Production

(Phase 8 - to be implemented)

```bash
POST /api/code/promote
{
  "commitHash": "3a231f7"
}
```

Will:
1. Merge staging → production branch
2. Apply migrations to production DB
3. Restart production server
4. Update CodeChange records

---

## Limitations

### Current Limitations

1. **No concurrent requests** - Only one modification at a time
2. **No undo UI** - Must use git revert manually
3. **No change preview** - Can't see diff before applying (Phase 6)
4. **No approval workflow** - Changes apply immediately

### Protected Operations

**Cannot modify:**
- Authentication files (`src/lib/auth.ts`, `src/middleware.ts`)
- Agent's own code (`src/lib/code-modification/**`, `src/lib/agents/**`)
- Configuration (`package.json`, `tsconfig.json`, `.env.*`)
- Git files (`.git/**`, `.gitignore`)

**Attempt results in:**
```json
{
  "success": false,
  "error": "Cannot modify protected file: src/lib/auth.ts"
}
```

---

## Troubleshooting Guide

### Issue: API returns 500

**Check:**
1. Server is running: `curl http://localhost:3000`
2. AWS credentials in `.env.local`
3. Server logs for errors

### Issue: "Model identifier invalid"

**Solution:**
```typescript
// In bedrock-client.ts
modelId: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0'
```

### Issue: TypeScript validation fails

**Check:**
- Generated code has JSX? Need `--jsx preserve` flag
- Validator has correct TypeScript config

### Issue: Tests keep failing

**Quick fix:**
```json
{ "skipTests": true }
```

**Proper fix:**
- Check what's breaking
- Fix the issue
- Re-enable tests

---

## Examples Library

### 1. Homepage Modification

```bash
npx ts-node test-api.ts "Change the homepage title to 'DeboraAI Dashboard'"
```

### 2. Add CSS Class

```bash
npx ts-node test-api.ts "Add a 'container' class to the main element in src/app/page.tsx"
```

### 3. New React Component

```bash
npx ts-node test-api.ts "Create a Header component in src/components/Header.tsx with a logo and navigation"
```

### 4. API Endpoint

```bash
npx ts-node test-api.ts "Create a POST endpoint at /api/users that creates a new user"
```

### 5. Database Model

```bash
npx ts-node test-api.ts "Create a Post model with title, content, authorId, and published fields"
```

### 6. Full Feature

```bash
npx ts-node test-api.ts "Add a comment system: Comment model with content and userId, POST /api/comments endpoint, and CommentList component"
```

---

## Conclusion

The DeboraAI API enables natural language code modifications with full safety guarantees:

✅ Natural language → Working code
✅ Automatic validation
✅ Safe operations with backups
✅ Git version control
✅ Automated testing
✅ Protected file enforcement

**Next:** Try it yourself!

```bash
cd staging
npx ts-node test-api.ts "Create an About page at src/app/about/page.tsx"
```
