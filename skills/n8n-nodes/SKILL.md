# n8n Workflow Generation Guide

This file is the primary entry point for AI agents tasked with building or analyzing n8n workflows.
It provides a structured overview of available nodes, patterns, and where to find detailed examples.

**Knowledge Base Stats**: 297 templates processed, 200 node types documented.

---

## How to Use This Knowledge Base

1. **Start here** — read this file for orientation and quick reference
2. [**Architectural patterns** ](#agent-flow-patterns--architectural-directives) — common workflow structures and best practices for designing new workflows
3. [**Category based rules**](#node-category-map) → `rules/SKILLS-*.md` preferred node types and flow per use case.
4. [**Known anti-patterns** ](#http-request-vs-native-nodes) — common mistakes to avoid when selecting nodes or designing flows

---

## Node Category Map

When selecting nodes for a workflow, use the skill rule for that category:

| What you need | Rule File |
|--------------|-----------|
| AI agent (autonomous, tool-using) | [langchain-agents.md](./rules/langchain-agents.md) |
| Language model (OpenAI, Claude, Gemini…) | [langchain-llms.md](./rules/langchain-llms.md) |
| Conversation memory | [langchain-memory.md](./rules/langchain-memory.md) |
| Vector store / RAG | [langchain-vectorstores.md](./rules/langchain-vectorstores.md) |
| Agent tools (search, calc, sub-workflow) | [langchain-tools.md](./rules/langchain-tools.md) |
| Document loading and chunking | [langchain-document-loaders.md](./rules/langchain-document-loaders.md) |
| Workflow triggers | [triggers.md](./rules/triggers.md) |
| Branching, merging, looping | [flow-control.md](./rules/flow-control.md) |
| Data mapping and transformation | [data-transform.md](./rules/data-transform.md) |
| Discord / Slack / Telegram / WhatsApp | [messaging.md](./rules/messaging.md) |
| Gmail / Outlook / Email | [email.md](./rules/email.md) |
| Google Sheets / Drive / Calendar | [google.md](./rules/google.md) |
| PostgreSQL / MySQL / MongoDB / Redis | [database.md](./rules/database.md) |
| Twitter / LinkedIn / YouTube | [social-media.md](./rules/social-media.md) |
| WordPress / Notion / Airtable | [cms-productivity.md](./rules/cms-productivity.md) |
| Files / PDFs / Images / Binary | [file-operations.md](./rules/file-operations.md) |
| HTTP APIs / Webhooks / GraphQL | [http-webhook.md](./rules/http-webhook.md) |
| Jira / Linear / ClickUp | [project-management.md](./rules/project-management.md) |
| SSH / Shell / AWS S3 / Cloud storage | [devops.md](./rules/devops.md) |
| CRM / HR / e-commerce | [crm.md](./rules/crm.md) |
| OpenAI direct (DALL-E, Whisper, TTS) | [openai-base.md](./rules/openai-base.md) |
| Credential management | [n8n-credentials.md](./rules/n8n-credentials.md) |

### Example files
> **Important** - Rule files and other snippets in this document may reference external examples files. These examples **SHOULD NOT BE USED AS THE PRIMARY SOURCE OF TRUTH** or include in the context for node selection or workflow design, as they may contain anti-patterns or outdated nodes. Always refer to the skill rules for the most up-to-date best practices. **ONLY** use these files if specifically instructed by the skill rule, and even then, use them as a secondary reference to understand how a particular node or pattern can be implemented, rather than a definitive guide.

---

## Critical Rules for Workflow Generation

### Node Selection
1. **Prefer native nodes over HTTP requests** — if a native node exists for a platform (Slack, Gmail, Notion, etc.), use it. Native nodes handle auth, pagination, and error codes automatically. See [the related section below for common examples](#http-request-vs-native-nodes).
2. **Use LangChain nodes for AI** — `@n8n/n8n-nodes-langchain.*` nodes are the correct namespace for LLM/agent work, not `n8n-nodes-base.openAi` (legacy).
3. **Sub-nodes connect differently** — LangChain LLM, memory, tool, and parser nodes connect to their parent via the sub-node connection type (not regular data connections). See [langchain-agents.md](./rules/langchain-agents.md#sub-node-connection-patterns) for connection JSON examples.

### Credentials
- Never hardcode credentials — reference them by credential name
- Use environment variables for sensitive values in automation contexts
- See `./rules/n8n-credentials.md` for credential injection patterns

### Expressions
- n8n expressions use `={{ expression }}` syntax
- Reference previous node output: `={{ $('Node Name').item.json.field }}`
- Reference current item: `={{ $json.field }}`
- Access all items: use Code node with `$input.all()`

### AI Agent Configuration Checklist
- [ ] Agent node (`@n8n/n8n-nodes-langchain.agent`) is the orchestrator
- [ ] An LLM sub-node is connected (e.g., `lmChatOpenAi`)
- [ ] Memory sub-node if conversational (e.g., `memoryBufferWindow`)
- [ ] At least one tool sub-node if agent needs external data
- [ ] System message defined in agent `options.systemMessage`
- [ ] Output parser if structured output required

### RAG Pipeline Checklist
- [ ] Separate ingestion and query workflows (or gated by IF node)
- [ ] Document loader → text splitter → vector store (insert mode) for ingestion
- [ ] Agent/chain + retriever tool pointing to same vector store for queries
- [ ] Same embedding model in both ingestion and query paths

---
## Quick References

### Expressions

```javascript
// Get field from previous node
={{ $('Set').item.json.email }}

// Get field from current item
={{ $json.title }}

// Concatenate strings
={{ $json.firstName + ' ' + $json.lastName }}

// Format date
={{ $now.toISO() }}

// Conditional expression
={{ $json.status === 'active' ? 'Yes' : 'No' }}

// Access all items in Code node
const items = $input.all();
return items.map(item => ({ json: { processed: item.json.value * 2 } }));

// Parse JSON string
={{ JSON.parse($json.rawJson) }}

// Access nested object
={{ $json.metadata?.tags?.[0] ?? 'untagged' }}
```

---

### Data Flow

#### Single Item Processing
```
Trigger → Process Node → Output Node
```

#### Batch Processing
```
Trigger → Get All Items → Split In Batches → Process → Aggregate
```

#### Conditional Routing
```
Trigger → IF (condition) → [true path] → Merge
                         → [false path] ↗
```

#### AI + Data Pattern
```
Trigger → Fetch Data → AI Chain/Agent → Parse Output → Store Result
```

#### Webhook + Async Pattern
```
Webhook → Respond (accepted) → Long Process → Notify via Slack/Email
```


## Agent Flow Patterns & Architectural Directives

General architectural patterns and best practices derived from 297 n8n workflow templates.
Use these guidelines when designing new workflows.

---

### 1. AI Agent Architecture Patterns

**Used in 121 templates.** The AI Agent node (`@n8n/n8n-nodes-langchain.agent`) is the primary orchestrator.

#### Pattern: Tool-Augmented Agent
```
[Chat Trigger / Webhook]
  → [AI Agent]
      ├─ [LLM: lmChatOpenAi]          # Required sub-node
      ├─ [Memory: memoryBufferWindow]  # Optional context
      ├─ [Tool: toolWorkflow]          # Sub-workflow as tool
      ├─ [Tool: toolHttpRequest]       # Direct API calls
      └─ [Tool: toolSerpApi / toolWikipedia]
  → [Respond to Webhook / Send Message]
```

**Key directives**:
- Always attach an LLM model sub-node to the agent
- Use `memoryBufferWindow` for single-session chat, `memoryPostgresChat` for persistent cross-session memory
- Prefer `toolWorkflow` for complex tool logic (keeps agent node clean)
- Attach `outputParserStructured` when agent must return structured JSON
- Set `systemMessage` in agent `options` to define agent persona and constraints

#### Agent Types (via `agent` parameter)
| Type | When to Use |
|------|------------|
| `conversationalAgent` (default) | General chat and task agents |
| `openAiFunctionsAgent` | When using OpenAI function calling |
| `toolsAgent` | With non-OpenAI models that support tool calling |
| `reActAgent` | Reasoning + Action pattern (older, less common) |
| `sqlAgent` | Database query agent — set `dataSource` |

---

### 2. RAG (Retrieval-Augmented Generation) Pipeline Pattern

**Used in 30 templates.** Standard pattern for Q&A over documents.

#### Ingestion Flow (run once)
```
[Trigger: Manual/Schedule/Drive]
  → [Load Documents: extractFromFile / HTTP / googleDrive]
  → [documentDefaultDataLoader]
      └─ [textSplitterRecursiveCharacterTextSplitter]  # chunk size 500-1000
  → [Vector Store Insert: vectorStoreQdrant/Pinecone/Supabase]
      └─ [embeddingsOpenAi]  # text-embedding-3-small
```

#### Query Flow (run on each request)
```
[Chat Trigger / Webhook]
  → [AI Agent or chainRetrievalQa]
      ├─ [LLM]
      ├─ [Memory]
      └─ [Tool: toolVectorStore → vectorStoreQdrant]
              └─ [embeddingsOpenAi]
```

**Key directives**:
- Default chunk size: 500 tokens, overlap: 100 tokens (RecursiveCharacterTextSplitter)
- For OpenAI: use `text-embedding-3-small` (faster/cheaper) unless accuracy is critical
- Use `vectorStoreQdrant` for self-hosted, `vectorStorePinecone` for managed cloud
- `vectorStoreSupabase` when already using Supabase as primary database

---

## 3. LLM Chain Patterns

**Used in 74 templates.** Simpler than agents — one prompt in, structured output.

### Pattern: Direct Chain with Structured Output
```
[Input Node]
  → [chainLlm]
      ├─ [lmChatOpenAi]
      └─ [outputParserStructured]  # JSON schema → validated output
  → [Process output: set / code]
```

### Pattern: Multi-step Chain
```
[Trigger]
  → [chainLlm: Step 1 - Extract]
      └─ [lmChatOpenAi]
  → [Set: prep data]
  → [chainLlm: Step 2 - Analyze]
      └─ [lmChatOpenAi]
  → [Output]
```

**Key directives**:
- Always attach an output parser when expecting structured data
- Use `outputParserAutofixing` to wrap `outputParserStructured` for resilience
- Temperature 0–0.3 for extraction/classification, 0.7–1.0 for creative generation
- For information extraction from text, prefer `informationExtractor` over raw chainLlm

---

### 4. Webhook + Response Patterns

**Used in ~55 templates.** Standard pattern for synchronous API endpoints.

#### Synchronous Response
```
[Webhook: POST /endpoint]
  → [Process data]
  → [respondToWebhook]   # Must be in same execution path
```

#### Asynchronous with Queuing
```
[Webhook: POST]
  → [respondToWebhook: {status: "accepted"}]  # Immediate ACK
  → [Wait / Delay]
  → [Background processing]
  → [Send result via Slack/Email/Webhook callback]
```

**Key directives**:
- Always pair a `webhook` with a `respondToWebhook` in the success path
- Set response `Content-Type` header when returning JSON: `application/json`
- Use `wait` node to implement async job patterns
- Validate inputs with an `if` node immediately after webhook trigger

---

### 5. Error Handling Patterns

**Used across 1 dedicated error workflows.**

#### Centralized Error Handler
```
[errorTrigger]  # catches all workflow errors
  → [Set: format error info]
  → [Slack/Email: notify team]
  → [Optionally: retry or escalate]
```

#### Per-Workflow Error Branch
```
[Any node] → {continueOnFail: true}
  → [if: $json.error exists]
      ├─ [true:  Handle error / log]
      └─ [false: Continue normal flow]
```

**Key directives**:
- Create one centralized error-handling workflow and set all production workflows to call it on error
- Set `continueOnFail: true` on HTTP request nodes that call unreliable services
- Use `stopAndError` to throw meaningful validation errors with context
- Always log: workflow name, execution ID, error message, input data sample

---

### 6. Human-in-the-Loop Patterns

**Used in 34 templates with `wait` node.**

#### Approval Gate
```
[Process / AI Output]
  → [Send for review: Slack/Email with approval link]
  → [Wait: webhook mode]  # Pause until human clicks approve/reject
  → [IF: approved?]
      ├─ [Yes: continue workflow]
      └─ [No: notify rejection]
```

#### Form-Based Input
```
[formTrigger]  # n8n-hosted form
  → [Validate inputs: if node]
  → [Process submission]
  → [form: show confirmation page]
```

**Key directives**:
- Use `wait` node in "webhook" mode for async approval gates
- Include a timeout on wait nodes to prevent indefinite pauses
- Use `formTrigger` for structured human input at workflow start
- For AI-assisted workflows, use `toolWorkflow` wrapping a `form` node for mid-flow human input

---

### 7. Batch Processing Patterns

**Used in ~51 templates.**

#### Standard Batch Loop
```
[Get all items: HTTP/DB query]
  → [splitInBatches: size 10-50]
  → [Process each batch]
  → [IF: batches done?]
      ├─ [No: loop back to splitInBatches]
      └─ [Yes: aggregate and finish]
```

#### Array Expansion Pattern
```
[Item with array field]
  → [splitOut: fieldToSplit = "items"]  # One item per array element
  → [Process each item]
  → [aggregate: merge results]
```

**Key directives**:
- Default batch size: 10 for API calls with rate limits, 50+ for database operations
- Always use `splitOut` instead of code-based array iteration when possible
- Use `aggregate` to collect results back after per-item processing
- Add `wait` node inside batch loops when hitting rate-limited APIs

---

### 8. Sub-Workflow Composition Pattern

**Used in 18 templates via `executeWorkflow`, 45 via `toolWorkflow`.**

#### Reusable Sub-Workflow
```
[executeWorkflowTrigger]  # entry point
  → [Receive: $json.inputData]
  → [Process]
  → [Return: set output fields]
```

Called from parent:
```
[executeWorkflow: workflowId = "sub-workflow-id"]
  → [Use returned data]
```

#### Agent Tool Wrapping
```
[toolWorkflow]
  name: "search_tool"
  description: "Searches the database for X. Input: query string."
  → [Points to sub-workflow that implements the tool]
```

**Key directives**:
- Use sub-workflows to modularize repeated logic (auth flows, formatting, etc.)
- Always document sub-workflow inputs/outputs via `executeWorkflowTrigger` node name
- When using as agent tool, write a clear `description` — the agent uses this to decide when to call the tool
- Prefer `toolWorkflow` over `toolCode` for complex tool logic that needs testing

---

### 9. LLM Provider Selection Guide

| Use Case | Recommended Model | Node |
|----------|------------------|------|
| General chat / agents | `gpt-4o` or `gpt-4o-mini` | `lmChatOpenAi` |
| Cost-sensitive bulk processing | `gpt-4o-mini` or `claude-3-haiku` | `lmChatOpenAi` / `lmChatAnthropic` |
| Long context (100k+ tokens) | `claude-3-5-sonnet` | `lmChatAnthropic` |
| Multimodal (vision) | `gpt-4o` or `gemini-1.5-pro` | `lmChatOpenAi` / `lmChatGoogleGemini` |
| Private / self-hosted | Any Ollama model | `lmChatOllama` |
| Fast inference, open models | `llama3-70b` via Groq | `lmChatGroq` |
| Reasoning/math | `deepseek-reasoner` (R1) | `lmChatDeepSeek` |

---

### 10. Node Selection Quick Reference

| Task | Preferred Node | Avoid |
|------|---------------|-------|
| Set/transform fields | `n8n-nodes-base.set` | Manual code for simple mappings |
| Complex transformation | `n8n-nodes-base.code` | Multiple chained Set nodes |
| Route by condition | `n8n-nodes-base.if` (2 paths) or `switch` (N paths) | — |
| Route by text/AI | `textClassifier` | Long Switch chains |
| Structured AI output | `outputParserStructured` + schema | Regex parsing LLM text |
| Loop over array | `splitOut` → process → `aggregate` | Code-based loops |
| Call external API | Native node if available, else `httpRequest` | — |
| Send notification | Platform native node (Slack/Telegram/etc.) | `httpRequest` to platform API |


---

## Anti-patterns to avoid

> **Legend**: Analyzing dozens of high ranked workflows some conflicts came up. A "conflict" is a case where two fundamentally
> different approaches can be used to the same task, and one approach should be clearly preferred.
> Pattern "variants" (valid alternative ways to solve different sub-problems) are documented in the skill rules themselves.

Anti-patterns found in workflow generations tend to include:
- Use `airtableTokenApi` insetad of  `airtableApi` (legacy API key) for Airtable. Airtable deprecated the old API key in Feb 2024.
- For Google services Service Account credential (`googleApi`) and OAuth2 (`googleDriveOAuth2Api`) are available. Service accounts are better for server-to-server automation; OAuth2 is needed for user-specific Drive access.
- Nodes using `httpRequest` vs native nodes for platforms. See examples below.

### HTTP Request vs Native Nodes
In most cases conflicts come when different nodes (or combination of nodes) are used for the same task. 
The key rule of thumb: prefer native platform nodes instead of `n8n-nodes-base.httpRequest` when available. A native node usually handles auth, rate limiting, and schema validation automatically.

Common examples of these conflicts:
- Slack: `n8n-nodes-base.slack`
- Telegram:  `n8n-nodes-base.telegram`
- Gmail: `n8n-nodes-base.gmail`
- Notion: `n8n-nodes-base.notion`
- Airtable: `n8n-nodes-base.airtable`
- WordPress: `n8n-nodes-base.wordpress`
- Youtube: `n8n-nodes-base.youTube`
- Twitter: `n8n-nodes-base.twitter`
- Linkedin: `n8n-nodes-base.linkedIn`

