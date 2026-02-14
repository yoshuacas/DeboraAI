# DeboraAI Architecture

## Overview

DeboraAI is a **self-modifying web application** where an AI agent can modify the application's own code based on natural language requests. The system uses AWS Bedrock (Claude 3.5 Sonnet) to understand requests and generate code changes, which are automatically validated, tested, and deployed.

## Core Concept

```
User Request (Natural Language)
    ↓
Claude 3.5 Sonnet (AWS Bedrock)
    ↓
Generated Code
    ↓
Validation & Safety Checks
    ↓
Apply to Staging
    ↓
Automated Tests
    ↓
Git Commit
    ↓
(Optional) Promote to Production
```

---

## System Architecture

### Technology Stack

**Frontend:**
- Next.js 14 (React 19)
- TypeScript
- Tailwind CSS
- App Router

**Backend:**
- Next.js API Routes
- Prisma ORM
- SQLite (separate staging/production DBs)

**AI/ML:**
- AWS Bedrock
- Claude 3.5 Sonnet v2

**DevOps:**
- Git Worktrees (staging/production)
- Simple-git for version control
- Jest + Playwright for testing

---

## Project Structure

```
/Users/davcasd/research/DeboraAI/
├── staging/                         # Staging environment (port 3000)
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   └── code/
│   │   │   │       └── modify/
│   │   │   │           └── route.ts      # ⭐ Main API endpoint
│   │   │   └── page.tsx                  # Homepage
│   │   └── lib/
│   │       ├── agents/
│   │       │   ├── bedrock-client.ts     # AWS Bedrock integration
│   │       │   ├── coding-agent.ts       # ⭐ AI coding agent
│   │       │   └── codebase-context.ts   # Codebase scanner
│   │       └── code-modification/
│   │           ├── protected-files.ts    # File protection
│   │           ├── file-manager.ts       # ⭐ Safe file operations
│   │           ├── validator.ts          # Code validation
│   │           ├── git-manager.ts        # ⭐ Git operations
│   │           ├── migration-manager.ts  # DB migrations
│   │           └── test-runner.ts        # Test orchestration
│   ├── prisma/
│   │   ├── schema.prisma                 # Database schema
│   │   └── staging.db                    # Staging database
│   ├── tests/
│   │   ├── unit/                         # 111 unit tests
│   │   ├── integration/                  # API integration tests
│   │   └── e2e/                          # Playwright E2E tests
│   └── .env.local                        # Environment variables
│
└── production/                      # Production environment (port 3001)
    └── (same structure as staging)
```

---

## Core Components

### 1. Coding Agent (`coding-agent.ts`)

**Purpose:** The "brain" of the system that generates code based on natural language.

**Key Features:**
- Loads complete codebase context
- Understands project structure, dependencies, database schema
- Knows which files are protected (auth, config, etc.)
- Generates multi-file changes (DB → API → UI)
- Provides reasoning and explanations
- Outputs structured JSON with file modifications

**System Prompt Strategy:**
```
1. Provide full codebase context
2. List protected files (cannot modify)
3. List sensitive files (extra care needed)
4. Explain JSON output format
5. Emphasize code quality and safety
```

**Example Flow:**
```typescript
const agent = new CodingAgent('/path/to/project');
await agent.initialize(); // Load codebase context

const response = await agent.generateCode({
  userRequest: "Add a dark mode toggle",
  conversationHistory: [...] // Optional
});

// Response includes:
// - modifications: Array of file changes
// - explanation: What was changed and why
// - thinking: Agent's reasoning process
// - warnings: Any concerns about the changes
```

---

### 2. Bedrock Client (`bedrock-client.ts`)

**Purpose:** AWS Bedrock integration for Claude 3.5 Sonnet.

**Configuration:**
- Model: `us.anthropic.claude-3-5-sonnet-20241022-v2:0`
- Region: `us-east-1` (configurable)
- Credentials: From environment variables

**API Methods:**
```typescript
// Complete text
await client.complete(prompt, systemPrompt);

// Chat with history
await client.chat(messages, systemPrompt);

// Full control
await client.invokeModel({
  messages,
  system,
  maxTokens: 8000,
  temperature: 0.3
});
```

**Response Format:**
```typescript
interface BedrockResponse {
  success: boolean;
  content: string;
  usage: { inputTokens, outputTokens };
  stopReason: string;
  error?: string;
}
```

---

### 3. File Manager (`file-manager.ts`)

**Purpose:** Safe file operations with protection checks and backups.

**Key Safety Features:**
1. **Protected File Checks** - Blocks modifications to auth, config, agent code
2. **Automatic Backups** - Creates timestamped backups before changes
3. **Atomic Operations** - All-or-nothing file modifications
4. **Rollback Support** - Restores backups if operations fail
5. **Operation Logging** - Tracks last 1000 file operations

**API Methods:**
```typescript
const fm = new FileManager('/project/root');

// Create file
await fm.createFile('src/components/Button.tsx', content);

// Write to existing file
await fm.writeFile('src/app/page.tsx', content, {
  createIfMissing: true
});

// Delete file
await fm.deleteFile('old-file.ts');

// Move/rename
await fm.moveFile('old.tsx', 'new.tsx');

// Atomic multi-file operations
await fm.applyModifications([
  { filePath: 'file1.ts', content: '...', createIfMissing: true },
  { filePath: 'file2.ts', content: '...', createIfMissing: true }
]);
// ↑ Rolls back ALL changes if ANY fail
```

**Protected Files:**
- `src/lib/auth.ts`, `src/middleware.ts`
- `src/app/api/auth/**`
- `src/lib/code-modification/**` (agent's own code!)
- `.env.*`, `package.json`, `tsconfig.json`
- `.git/**`, `node_modules/**`

---

### 4. Validator (`validator.ts`)

**Purpose:** Validate generated code before applying changes.

**Validation Types:**
1. **TypeScript/TSX** - Syntax checking with `tsc --noEmit --jsx preserve`
2. **JavaScript/JSX** - Basic syntax validation
3. **JSON** - JSON.parse() validation
4. **Prisma** - Schema validation with `prisma validate`

**API:**
```typescript
const validator = new Validator('/project/root');

// Validate single file
const result = await validator.validateFile(
  'src/app/page.tsx',
  content
);

// Validate multiple files
const batchResult = await validator.validateFiles([
  { filePath: 'file1.ts', content: '...' },
  { filePath: 'file2.json', content: '...' }
]);

if (!batchResult.valid) {
  console.error('Validation errors:', batchResult.errors);
  // Block deployment
}
```

**Error Handling:**
- Captures TypeScript compiler errors
- Reports line numbers and error messages
- Blocks deployment if validation fails

---

### 5. Git Manager (`git-manager.ts`)

**Purpose:** Version control operations using simple-git.

**Key Operations:**
```typescript
const git = new GitManager('/project/root');

// Get status
await git.getStatus();

// Stage files
await git.stageFiles(['src/app/page.tsx']);

// Commit changes
await git.commit({
  message: 'AI: Add dark mode toggle',
  files: ['src/app/page.tsx'],
  author: {
    name: 'DeboraAI Agent',
    email: 'agent@deboraai.local'
  }
});

// Merge branches (staging → production)
await git.mergeBranch('staging');

// Rollback
await git.revertCommit(commitHash);
await git.rollbackToCommit(commitHash, hard: true);
```

**Commit Format:**
```
AI: <user request>

<explanation>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

### 6. Test Runner (`test-runner.ts`)

**Purpose:** Run automated tests before deployment to catch broken code.

**Test Types:**
1. **Unit Tests** - Jest (default: runs)
2. **Integration Tests** - API endpoint tests (default: runs)
3. **E2E Tests** - Playwright (default: skipped for speed)

**Configuration:**
```typescript
const result = await runTests({
  runUnit: true,
  runIntegration: true,
  runE2E: false,
  collectCoverage: true,
  coverageThreshold: 70
});

if (!result.success) {
  throw new Error('Tests failed - blocking deployment');
}
```

**Coverage Requirements:**
- Lines: 70%
- Statements: 70%
- Functions: 70%
- Branches: 70%

**Deployment Blocking:**
If tests fail, the deployment is automatically rolled back via git revert.

---

### 7. Migration Manager (`migration-manager.ts`)

**Purpose:** Handle Prisma database schema changes safely.

**Operations:**
```typescript
const mm = new MigrationManager('/project/root');

// Validate schema
await mm.validateSchema();

// Generate migration
await mm.generateMigration({
  name: 'add_user_bio'
});

// Apply pending migrations
await mm.applyMigrations();

// Generate Prisma client
await mm.generateClient();

// Complete workflow
const result = await mm.handleSchemaChange('migration_name');
// ↑ Validates → Generates → Applies → Updates client
```

---

## Request Lifecycle

### Complete Flow: User Request → Deployed Code

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Request                                              │
│    POST /api/code/modify                                    │
│    { "message": "Add a dark mode toggle" }                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Initialize Services                                       │
│    - CodingAgent (load codebase context)                    │
│    - FileManager, Validator, GitManager, MigrationManager   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Generate Code with Claude 3.5 Sonnet                     │
│    - Send request + codebase context to AWS Bedrock         │
│    - Receive structured JSON with file modifications        │
│    - Parse: modifications[], explanation, thinking          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Validate Generated Code                                   │
│    - TypeScript/TSX syntax check                            │
│    - JSON format validation                                  │
│    - Prisma schema validation                                │
│    - Block if validation fails                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Apply Changes Safely                                      │
│    - Check protected files (throw error if protected)       │
│    - Create automatic backups                                │
│    - Apply file modifications atomically                     │
│    - Rollback if any operation fails                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Handle Database Migrations (if schema changed)           │
│    - Detect prisma/schema.prisma modifications              │
│    - Generate Prisma migration                               │
│    - Apply to database                                       │
│    - Regenerate Prisma client                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Create Git Commit                                         │
│    - Stage modified files                                    │
│    - Create commit with AI co-author                         │
│    - Include explanation in commit message                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. Run Automated Tests                                       │
│    - Unit tests (Jest)                                       │
│    - Integration tests (API)                                 │
│    - Check coverage thresholds                               │
│    - REVERT COMMIT if tests fail                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. Return Results                                            │
│    {                                                          │
│      success: true,                                          │
│      modifications: [...],                                   │
│      explanation: "...",                                     │
│      commit: { hash: "...", message: "..." },               │
│      tests: { passed: 111, failed: 0, total: 111 },        │
│      duration: 8617ms                                        │
│    }                                                          │
└─────────────────────────────────────────────────────────────┘
```

**Typical Response Time:** 8-15 seconds

---

## Safety Mechanisms

### 1. Protected Files

Files that the agent **CANNOT** modify:
- Authentication: `src/lib/auth.ts`, `src/middleware.ts`
- Auth routes: `src/app/api/auth/**`
- Agent's own code: `src/lib/code-modification/**`, `src/lib/agents/**`
- Configuration: `.env.*`, `package.json`, `tsconfig.json`, `next.config.*`
- Version control: `.git/**`, `.gitignore`

**Enforcement:** FileManager throws `ProtectedFileError` on attempt.

### 2. Sensitive Files

Files that require **extra validation**:
- `prisma/schema.prisma` - Database schema
- `src/app/layout.tsx` - Root layout
- `src/lib/**/*.ts` - Core libraries

**Enforcement:** Warning logged, extra validation applied.

### 3. Validation Pipeline

Every code change goes through:
1. **Syntax validation** - TypeScript compiler check
2. **Format validation** - JSON.parse() for JSON files
3. **Schema validation** - Prisma validate for schema changes

**Result:** Invalid code is rejected before touching the filesystem.

### 4. Automatic Backups

Before any file modification:
1. Original file copied to `.backups/` with timestamp
2. If write fails, backup is restored automatically
3. Backups persist for manual recovery if needed

### 5. Atomic Operations

Multi-file modifications are all-or-nothing:
```typescript
await fileManager.applyModifications([
  { filePath: 'file1.ts', content: '...' },
  { filePath: 'file2.ts', content: '...' },
  { filePath: 'file3.ts', content: '...' }
]);
// If file2 fails, file1 is rolled back
// file3 is never touched
```

### 6. Test-Driven Deployment

Tests run automatically before deployment:
- If tests pass → Changes stay
- If tests fail → Commit reverted, changes rolled back

### 7. Git Version Control

Every change is committed with:
- Full explanation of what changed
- AI co-author attribution
- Ability to revert (`git revert <hash>`)

---

## Environment Configuration

### Staging (port 3000)

```env
# .env.local
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

NEXTAUTH_SECRET=staging_secret
NEXTAUTH_URL=http://localhost:3000

DATABASE_URL="file:./prisma/staging.db"
NODE_ENV=development
PORT=3000

WORKTREE_TYPE=staging
```

### Production (port 3001)

```env
# .env.local
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

NEXTAUTH_SECRET=production_secret
NEXTAUTH_URL=http://localhost:3001

DATABASE_URL="file:./prisma/production.db"
NODE_ENV=production
PORT=3001

WORKTREE_TYPE=production
```

---

## Database Schema

```prisma
// prisma/schema.prisma

model User {
  id       String   @id @default(cuid())
  email    String   @unique
  password String
  name     String?
  role     UserRole @default(CUSTOMER)
  chats    Chat[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum UserRole {
  ADMIN
  CUSTOMER
}

model Chat {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  messages  Json     // Conversation history
  type      ChatType
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum ChatType {
  CODING_AGENT
  LEGAL_AGENT
}

model CodeChange {
  id          String   @id @default(cuid())
  description String
  files       Json     // Array of modified files
  commitHash  String
  branch      String   // staging or main
  status      ChangeStatus @default(PENDING)
  createdAt   DateTime @default(now())
  promotedAt  DateTime?
}

enum ChangeStatus {
  PENDING
  DEPLOYED_STAGING
  DEPLOYED_PRODUCTION
  ROLLED_BACK
}

model Case {
  id          String   @id @default(cuid())
  title       String
  description String
  status      CaseStatus @default(OPEN)
  userId      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum CaseStatus {
  OPEN
  IN_PROGRESS
  CLOSED
}
```

---

## Testing Strategy

### Unit Tests (111 tests)

Location: `tests/unit/`

**Services Tested:**
- `protected-files.test.ts` (18 tests)
- `file-manager.test.ts` (19 tests)
- `validator.test.ts` (19 tests)
- `git-manager.test.ts` (13 tests)
- `migration-manager.test.ts` (7 tests)
- `test-runner.test.ts` (6 tests)
- `codebase-context.test.ts` (6 tests)
- `bedrock-client.test.ts` (8 tests)
- `coding-agent.test.ts` (7 tests)
- `example.test.ts` (6 tests)

**Running Tests:**
```bash
npm test                    # All unit tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage
```

### Integration Tests

Location: `tests/integration/`

**Tests:**
- API endpoint testing
- Database operations
- Multi-service workflows

### E2E Tests

Location: `tests/e2e/`

**Tests:**
- Complete user flows
- Browser automation with Playwright
- Staging/production environments

**Running E2E:**
```bash
npm run test:e2e
```

---

## Performance Characteristics

**API Response Times:**
- Simple modification (add comment): ~8-10 seconds
- Medium modification (new component): ~12-18 seconds
- Complex modification (DB + API + UI): ~20-30 seconds

**Bottlenecks:**
1. AWS Bedrock API call: 5-10 seconds
2. TypeScript validation: 1-3 seconds
3. Test execution: 1-5 seconds (if enabled)

**Optimization Opportunities:**
- Cache codebase context (rebuild only on changes)
- Skip tests for simple changes (dev mode)
- Parallel validation for multiple files

---

## Security Considerations

### 1. Protected Files Enforcement

The agent **physically cannot** modify:
- Authentication code
- Configuration files
- Its own code

**Implementation:** FileManager throws exception on attempt.

### 2. AWS Credentials

Stored in `.env.local` (gitignored):
- Never committed to repository
- Required for Bedrock API access

### 3. Code Validation

All generated code is:
- Syntax checked before application
- Type checked with TypeScript
- Tested automatically

### 4. Git History

Every change is:
- Tracked in git with full context
- Revertible at any time
- Attributed to AI agent

### 5. Atomic Operations

Failed operations are:
- Automatically rolled back
- Leave no partial state
- Restore from backups

---

## Known Limitations

### Current Limitations

1. **Single Instance** - No concurrent modification support
2. **Local Only** - Not deployed to cloud
3. **Manual Promotion** - Staging → Production requires manual step
4. **No UI** - Command-line only (Phase 6 will add UI)
5. **No SSE** - No real-time notifications (Phase 7)

### Future Enhancements

- Multi-user support
- Real-time collaboration
- Cloud deployment
- Advanced rollback strategies
- Code review workflow
- Change approval system

---

## Troubleshooting

### Common Issues

**1. AWS Bedrock Model Error**
```
Error: The provided model identifier is invalid
```
**Solution:** Ensure using correct model ID:
```typescript
modelId: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0'
```

**2. TypeScript Validation Fails**
```
Error: Cannot use JSX unless the '--jsx' flag is provided
```
**Solution:** Validator now includes `--jsx preserve` flag.

**3. JSON Parsing Error**
```
Error: Bad control character in string
```
**Solution:** Ensure Claude response uses proper JSON escaping.

**4. Protected File Error**
```
ProtectedFileError: Cannot modify protected file
```
**Solution:** This is intentional - agent should not modify that file.

---

## Conclusion

DeboraAI demonstrates a **working prototype** of an AI-driven self-modifying application. The core functionality (Phases 1-5) is complete and operational, enabling natural language requests to be converted into working code changes that are validated, tested, and deployed automatically.

The remaining phases (6-11) add user interface, real-time updates, and production deployment features to make the system production-ready.

**Key Achievement:** Natural language → Working code in ~8-10 seconds with full safety guarantees.
