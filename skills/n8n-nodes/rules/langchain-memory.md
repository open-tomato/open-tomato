---
tags: [n8n, langchain, memory, conversation, context, postgres]
category: langchain-memory
description: Conversation memory management — buffer window, persistent postgres, and managed memory nodes
---

# LangChain Memory

## Overview
Conversation memory management — buffer window, persistent postgres, and managed memory nodes.

## Nodes in This Category

---

### MemoryBufferWindow
**Type**: `@n8n/n8n-nodes-langchain.memoryBufferWindow`  
**Description**: In-memory sliding window conversation history. Stores last N messages in-process. Not persistent across executions.  
**Auth Required**: `none`  
**Usage Count**: 60 templates

#### Usage Examples

##### Example 1: Window Buffer Memory
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI.json`  
**Workflow**: Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI

##### Example 2: LLM Memory Buffer (Input Context)
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Open Deep Research - AI-Powered Autonomous Research Workflow.json`  
**Workflow**: Open Deep Research - AI-Powered Autonomous Research Workflow

**Configuration**:
```json
{
  "sessionKey": "my_test_session",
  "sessionIdType": "customKey",
  "contextWindowLength": 20
}
```

##### Example 3: Window Buffer Memory
**Source**: `examples/Airtable/AI Agent to chat with Airtable and analyze data.json`  
**Workflow**: AI Agent to chat with Airtable and analyze data

**Configuration**:
```json
{
  "sessionKey": "={{ $('When chat message received').item.json.sessionId }}",
  "sessionIdType": "customKey"
}
```

##### Example 4: Window Buffer Memory
**Source**: `examples/Database_and_Storage/Generate SQL queries from schema only - AI-powered.json`  
**Workflow**: Generate SQL queries from schema only - AI-powered

**Configuration**:
```json
{
  "contextWindowLength": 10
}
```

##### Example 5: Window Buffer Memory
**Source**: `examples/OpenAI_and_LLMs/Chat with OpenAI Assistant (by adding a memory).json`  
**Workflow**: Chat with OpenAI Assistant (by adding a memory)

**Configuration**:
```json
{
  "sessionKey": "={{ $('Chat Trigger').item.json.sessionId }}123",
  "contextWindowLength": 20
}
```


---

### MemoryManager
**Type**: `@n8n/n8n-nodes-langchain.memoryManager`  
**Description**: Manages conversation memory with explicit get/set operations for fine-grained control.  
**Auth Required**: `none`  
**Usage Count**: 6 templates

#### Common Operations/Modes
- `delete`
- `insert`

#### Usage Examples

##### Example 1: Clear For Next Interview
**Source**: `examples/Forms_and_Surveys/Conversational Interviews with AI Agents and n8n Forms.json`  
**Workflow**: Conversational Interviews with AI Agents and n8n Forms

**Configuration**:
```json
{
  "mode": "delete",
  "deleteMode": "all"
}
```

##### Example 2: Get Chat
**Source**: `examples/OpenAI_and_LLMs/AI Voice Chat using Webhook, Memory Manager, OpenAI, Google Gemini & ElevenLabs.json`  
**Workflow**: AI Voice Chat using Webhook, Memory Manager, OpenAI, Google Gemini & ElevenLabs

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 3: Insert Chat
**Source**: `examples/OpenAI_and_LLMs/AI Voice Chat using Webhook, Memory Manager, OpenAI, Google Gemini & ElevenLabs.json`  
**Workflow**: AI Voice Chat using Webhook, Memory Manager, OpenAI, Google Gemini & ElevenLabs

**Configuration**:
```json
{
  "mode": "insert",
  "messages": {
    "messageValues": [
      {
        "type": "user",
        "message": "={{ $('OpenAI - Speech to Text').item.json[\"text\"] }}"
      },
      {
        "type": "ai",
        "message": "={{ $json.text }}"
      }
    ]
  }
}
```

##### Example 4: Chat Memory Manager
**Source**: `examples/OpenAI_and_LLMs/Chat with OpenAI Assistant (by adding a memory).json`  
**Workflow**: Chat with OpenAI Assistant (by adding a memory)

##### Example 5: Chat Memory Manager1
**Source**: `examples/OpenAI_and_LLMs/Chat with OpenAI Assistant (by adding a memory).json`  
**Workflow**: Chat with OpenAI Assistant (by adding a memory)

**Configuration**:
```json
{
  "mode": "insert",
  "messages": {
    "messageValues": [
      {
        "type": "user",
        "message": "={{ $('Chat Trigger').item.json.chatInput }}"
      },
      {
        "type": "ai",
        "message": "={{ $json.output }}"
      }
    ]
  }
}
```


---

### MemoryPostgresChat
**Type**: `@n8n/n8n-nodes-langchain.memoryPostgresChat`  
**Description**: Persistent conversation memory stored in a PostgreSQL table. Survives workflow restarts.  
**Auth Required**: `postgres`  
**Usage Count**: 6 templates

#### Usage Examples

##### Example 1: Postgres Chat Memory
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Extract insights & analyse YouTube comments via AI Agent chat.json`  
**Workflow**: Extract insights & analyse YouTube comments via AI Agent chat

**Credentials**: `{{CREDENTIAL_postgres}}`

**Configuration**:
```json
{
  "sessionKey": "={{ $('When chat message received').item.json.sessionId }}",
  "sessionIdType": "customKey"
}
```

##### Example 2: Postgres Chat Memory
**Source**: `examples/OpenAI_and_LLMs/AI Agent to chat with you Search Console Data, using OpenAI and Postgres.json`  
**Workflow**: AI Agent to chat with you Search Console Data, using OpenAI and Postgres

**Credentials**: `{{CREDENTIAL_postgres}}`

**Configuration**:
```json
{
  "tableName": "insights_chat_histories"
}
```

##### Example 3: Postgres Chat Memory
**Source**: `examples/OpenAI_and_LLMs/Chat Assistant (OpenAI assistant) with Postgres Memory And API Calling Capabalities.json`  
**Workflow**: modelo do chatbot

**Credentials**: `{{CREDENTIAL_postgres}}`

**Configuration**:
```json
{
  "tableName": "aimessages",
  "sessionKey": "={{ $('Chat Trigger').item.json.session_id }}{{ $json.sessionId }}",
  "sessionIdType": "customKey",
  "contextWindowLength": 30
}
```

##### Example 4: Postgres Chat Memory
**Source**: `examples/HR_and_Recruitment/HR & IT Helpdesk Chatbot with Audio Transcription.json`  
**Workflow**: HR & IT Helpdesk Chatbot with Audio Transcription

**Credentials**: `{{CREDENTIAL_postgres}}`

**Configuration**:
```json
{
  "sessionKey": "={{ $('Telegram Trigger').item.json.message.chat.id }}",
  "sessionIdType": "customKey"
}
```

##### Example 5: Postgres Chat Memory1
**Source**: `examples/OpenAI_and_LLMs/Chat Assistant (OpenAI assistant) with Postgres Memory And API Calling Capabalities.json`  
**Workflow**: modelo do chatbot

**Credentials**: `{{CREDENTIAL_postgres}}`

**Configuration**:
```json
{
  "tableName": "aimessages",
  "sessionKey": "={{ $('Chat Trigger').item.json.session_id }}{{ $json.sessionId }}",
  "sessionIdType": "customKey",
  "contextWindowLength": 1
}
```

