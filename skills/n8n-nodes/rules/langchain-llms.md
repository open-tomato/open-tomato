---
tags: [n8n, langchain, llm, openai, anthropic, gemini, ollama, groq, mistral]
category: langchain-llms
description: Chat and completion language model nodes for all major LLM providers
---

# LangChain Language Models

## Overview
Chat and completion language model nodes for all major LLM providers.

## Nodes in This Category

---

### LmChatOpenAi
**Type**: `@n8n/n8n-nodes-langchain.lmChatOpenAi`  
**Description**: OpenAI chat model node. Supports GPT-4o, GPT-4, GPT-3.5-turbo and fine-tuned variants. Configure model, temperature, max tokens.  
**Auth Required**: `openAiApi`  
**Usage Count**: 204 templates

#### Usage Examples

##### Example 1: OpenAI Chat Model
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Autonomous AI crawler.json`  
**Workflow**: Autonomous AI crawler

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "model": "gpt-4o",
  "options": {
    "temperature": 0,
    "responseFormat": "json_object"
  },
  "requestOptions": {}
}
```

##### Example 2: OpenAI Chat Model
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI.json`  
**Workflow**: Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 3: OpenAI Chat Model
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI.json`  
**Workflow**: Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "model": "gpt-4o-mini",
  "options": {}
}
```

##### Example 4: OpenAI Chat Model
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Chat with GitHub API Documentation_ RAG-Powered Chatbot with Pinecone & OpenAI.json`  
**Workflow**: Chat with GitHub OpenAPI Specification using RAG (Pinecone and OpenAI)

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 5: OpenAI Chat Model1
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Chat with GitHub API Documentation_ RAG-Powered Chatbot with Pinecone & OpenAI.json`  
**Workflow**: Chat with GitHub OpenAPI Specification using RAG (Pinecone and OpenAI)

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "options": {}
}
```


---

### LmChatAnthropic
**Type**: `@n8n/n8n-nodes-langchain.lmChatAnthropic`  
**Description**: Anthropic Claude chat model. Supports claude-3-5-sonnet, claude-3-opus, claude-3-haiku.  
**Auth Required**: `anthropicApi`  
**Usage Count**: 11 templates

#### Usage Examples

##### Example 1: Anthropic Chat Model
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Generate SEO Seed Keywords Using AI.json`  
**Workflow**: Generate SEO Seed Keywords Using AI

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 2: Anthropic Chat Model
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Intelligent Web Query and Semantic Re-Ranking Flow using Brave and Google Gemini.json`  
**Workflow**: Intelligent Web Query and Semantic Re-Ranking Flow

**Credentials**: `{{CREDENTIAL_anthropicApi}}`

**Configuration**:
```json
{
  "model": "claude-3-5-haiku-20241022",
  "options": {
    "topP": 0.8,
    "temperature": 0.4,
    "maxTokensToSample": 4096
  }
}
```

##### Example 3: Anthropic Chat Model1
**Source**: `examples/Linear/AI-powered research assistant with Linear, Scrapeless, and Claude.json`  
**Workflow**: Build an AI-Powered Research Assistant with Linear + Scrapeless + Claude

**Credentials**: `{{CREDENTIAL_anthropicApi}}`

**Configuration**:
```json
{
  "model": {
    "__rl": true,
    "mode": "list",
    "value": "claude-sonnet-4-20250514",
    "cachedResultName": "Claude 4 Sonnet"
  },
  "options": {
    "temperature": 0.3,
    "maxTokensToSample": 4000
  }
}
```

##### Example 4: Anthropic Chat Model
**Source**: `examples/LinkedIn/content_creator.json`  
**Workflow**: content_creator

**Credentials**: `{{CREDENTIAL_anthropicApi}}`

**Configuration**:
```json
{
  "model": {
    "__rl": true,
    "mode": "list",
    "value": "claude-3-7-sonnet-20250219",
    "cachedResultName": "Claude 3.7 Sonnet"
  },
  "options": {}
}
```

##### Example 5: Anthropic Chat Model
**Source**: `examples/Notion/Notion AI Assistant Generator.json`  
**Workflow**: Notion AI Assistant Generator

**Configuration**:
```json
{
  "options": {
    "temperature": 0.7,
    "maxTokensToSample": 8192
  }
}
```


---

### LmChatGoogleGemini
**Type**: `@n8n/n8n-nodes-langchain.lmChatGoogleGemini`  
**Description**: Google Gemini chat model. Supports gemini-1.5-pro, gemini-1.5-flash, gemini-2.0-flash-exp.  
**Auth Required**: `googlePalmApi`  
**Usage Count**: 35 templates

#### Usage Examples

##### Example 1: Parser Model
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Intelligent Web Query and Semantic Re-Ranking Flow using Brave and Google Gemini.json`  
**Workflow**: Intelligent Web Query and Semantic Re-Ranking Flow

**Credentials**: `{{CREDENTIAL_googlePalmApi}}`

**Configuration**:
```json
{
  "options": {
    "topP": 0.6,
    "temperature": 0.4,
    "maxOutputTokens": 4096
  },
  "modelName": "models/gemini-1.5-flash-002"
}
```

##### Example 2: Google Gemini Chat Model
**Source**: `examples/Gmail_and_Email_Automation/📈 Receive Daily Market News from FT.com to your Microsoft outlook inbox.json`  
**Workflow**: 📈 Receive Daily Market News from FT.com to your Microsoft outlook inbox

**Credentials**: `{{CREDENTIAL_googlePalmApi}}`

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 3: Agent Model
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Intelligent Web Query and Semantic Re-Ranking Flow using Brave and Google Gemini.json`  
**Workflow**: Intelligent Web Query and Semantic Re-Ranking Flow

**Credentials**: `{{CREDENTIAL_googlePalmApi}}`

**Configuration**:
```json
{
  "options": {
    "topP": 0.6,
    "temperature": 0.4,
    "safetySettings": {
      "values": [
        {
          "category": "HARM_CATEGORY_HARASSMENT",
          "threshold": "BLOCK_NONE"
        },
        {
          "category": "HARM_CATEGORY_HATE_SPEECH",
          "threshold": "BLOCK_NONE"
        },
        {
          "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          "threshold": "BLOCK_NONE"
        },
        {
          "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
          "threshold": "BLOCK_NONE"
        }
      ]
    },
    "maxOutputTokens": 4086
  },
  "modelName": "models/gemini-1.5-flash-002"
}
```

##### Example 4: Google Gemini Chat Model
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Learn Anything from HN - Get Top Resource Recommendations from Hacker News.json`  
**Workflow**: Learn Anything from HN - Get Top Resource Recommendations from Hacker News

**Credentials**: `{{CREDENTIAL_googlePalmApi}}`

**Configuration**:
```json
{
  "options": {},
  "modelName": "models/gemini-1.5-flash"
}
```

##### Example 5: Google Gemini Chat Model
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Visual Regression Testing with Apify and AI Vision Model.json`  
**Workflow**: Visual Regression Testing with Apify and AI Vision Model

**Credentials**: `{{CREDENTIAL_googlePalmApi}}`

**Configuration**:
```json
{
  "options": {},
  "modelName": "models/gemini-1.5-pro-latest"
}
```


---

### LmChatGroq
**Type**: `@n8n/n8n-nodes-langchain.lmChatGroq`  
**Description**: Groq LLM inference. Supports llama3, mixtral and other open models with fast inference.  
**Auth Required**: `groqApi`  
**Usage Count**: 5 templates

#### Usage Examples

##### Example 1: Groq Chat Model
**Source**: `examples/Forms_and_Surveys/Conversational Interviews with AI Agents and n8n Forms.json`  
**Workflow**: Conversational Interviews with AI Agents and n8n Forms

**Credentials**: `{{CREDENTIAL_groqApi}}`

**Configuration**:
```json
{
  "model": "llama-3.2-90b-text-preview",
  "options": {}
}
```

##### Example 2: Groq Chat Model
**Source**: `examples/Forms_and_Surveys/Email Subscription Service with n8n Forms, Airtable and AI.json`  
**Workflow**: Email Subscription Service with n8n Forms, Airtable and AI

**Credentials**: `{{CREDENTIAL_groqApi}}`

**Configuration**:
```json
{
  "model": "llama-3.3-70b-versatile",
  "options": {}
}
```

##### Example 3: Groq Chat Model
**Source**: `examples/Gmail_and_Email_Automation/Extract spending history from gmail to google sheet.json`  
**Workflow**: Extract spend details (template)

**Credentials**: `{{CREDENTIAL_groqApi}}`

**Configuration**:
```json
{
  "model": "llama-3.2-11b-text-preview",
  "options": {}
}
```

##### Example 4: Groq Chat Model
**Source**: `examples/Telegram/TeleBot_KnowledgeHub.json`  
**Workflow**: TeleBot_KnowledgeHub

**Credentials**: `{{CREDENTIAL_groqApi}}`

**Configuration**:
```json
{
  "model": "llama-3.1-8b-instant",
  "options": {}
}
```

##### Example 5: Groq Chat Model
**Source**: `examples/Telegram/Telegram chat with PDF.json`  
**Workflow**: Telegram RAG pdf

**Credentials**: `{{CREDENTIAL_groqApi}}`

**Configuration**:
```json
{
  "model": "llama-3.1-70b-versatile",
  "options": {}
}
```


---

### LmChatMistralCloud
**Type**: `@n8n/n8n-nodes-langchain.lmChatMistralCloud`  
**Description**: Mistral AI chat model. Supports mistral-large, mistral-medium, mistral-small.  
**Auth Required**: `mistralCloudApi`  
**Usage Count**: 6 templates

#### Usage Examples

##### Example 1: Mistral Cloud Chat Model
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Financial Documents Assistant using Qdrant and Mistral.ai.json`  
**Workflow**: Build a Financial Documents Assistant using Qdrant and Mistral.ai

**Credentials**: `{{CREDENTIAL_mistralCloudApi}}`

**Configuration**:
```json
{
  "model": "mistral-small-2402",
  "options": {}
}
```

##### Example 2: Mistral Cloud Chat Model2
**Source**: `examples/PDF_and_Document_Processing/Breakdown Documents into Study Notes using Templating MistralAI and Qdrant.json`  
**Workflow**: Breakdown Documents into Study Notes using Templating MistralAI and Qdrant

**Credentials**: `{{CREDENTIAL_mistralCloudApi}}`

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 3: Mistral Cloud Chat Model
**Source**: `examples/OpenAI_and_LLMs/Organise Your Local File Directories With AI.json`  
**Workflow**: Organise Your Local File Directories With AI

**Credentials**: `{{CREDENTIAL_mistralCloudApi}}`

**Configuration**:
```json
{
  "model": "mistral-small-2402",
  "options": {}
}
```

##### Example 4: Mistral Cloud Chat Model
**Source**: `examples/PDF_and_Document_Processing/Breakdown Documents into Study Notes using Templating MistralAI and Qdrant.json`  
**Workflow**: Breakdown Documents into Study Notes using Templating MistralAI and Qdrant

**Credentials**: `{{CREDENTIAL_mistralCloudApi}}`

**Configuration**:
```json
{
  "model": "open-mixtral-8x7b",
  "options": {}
}
```

##### Example 5: Mistral Cloud Chat Model1
**Source**: `examples/PDF_and_Document_Processing/Breakdown Documents into Study Notes using Templating MistralAI and Qdrant.json`  
**Workflow**: Breakdown Documents into Study Notes using Templating MistralAI and Qdrant

**Credentials**: `{{CREDENTIAL_mistralCloudApi}}`

**Configuration**:
```json
{
  "model": "open-mixtral-8x7b",
  "options": {}
}
```


---

### LmChatOllama
**Type**: `@n8n/n8n-nodes-langchain.lmChatOllama`  
**Description**: Local Ollama model runner. Connects to a self-hosted Ollama instance for private LLM inference.  
**Auth Required**: `ollamaApi`  
**Usage Count**: 8 templates

#### Usage Examples

##### Example 1: Ollama Chat Model1
**Source**: `examples/Gmail_and_Email_Automation/Auto Categorise Outlook Emails with AI.json`  
**Workflow**: Auto Categorise Outlook Emails with AI

**Configuration**:
```json
{
  "model": "qwen2.5:14b",
  "options": {
    "temperature": 0.2
  }
}
```

##### Example 2: Ollama Chat Model
**Source**: `examples/OpenAI_and_LLMs/Chat with local LLMs using n8n and Ollama.json`  
**Workflow**: Chat with local LLMs using n8n and Ollama

**Credentials**: `{{CREDENTIAL_ollamaApi}}`

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 3: Ollama Chat Model
**Source**: `examples/OpenAI_and_LLMs/AI Agent with Ollama for current weather and wiki.json`  
**Workflow**: AI Agent with Ollama for current weather and wiki

**Credentials**: `{{CREDENTIAL_ollamaApi}}`

**Configuration**:
```json
{
  "model": "llama3.2:latest",
  "options": {}
}
```

##### Example 4: Ollama Chat Model
**Source**: `examples/OpenAI_and_LLMs/Detect hallucinations using specialised Ollama model bespoke-minicheck.json`  
**Workflow**: Detect hallucinations using specialised Ollama model bespoke-minicheck

**Credentials**: `{{CREDENTIAL_ollamaApi}}`

**Configuration**:
```json
{
  "model": "bespoke-minicheck:latest",
  "options": {}
}
```

##### Example 5: Ollama Chat Model
**Source**: `examples/OpenAI_and_LLMs/Extract personal data with self-hosted LLM Mistral NeMo.json`  
**Workflow**: Extract personal data with a self-hosted LLM Mistral NeMo

**Credentials**: `{{CREDENTIAL_ollamaApi}}`

**Configuration**:
```json
{
  "model": "mistral-nemo:latest",
  "options": {
    "useMLock": true,
    "keepAlive": "2h",
    "temperature": 0.1
  }
}
```


---

### LmChatDeepSeek
**Type**: `@n8n/n8n-nodes-langchain.lmChatDeepSeek`  
**Description**: DeepSeek chat model. Supports deepseek-chat and deepseek-reasoner (R1) models.  
**Auth Required**: `deepSeekApi`  
**Usage Count**: 1 templates

#### Usage Examples

##### Example 1: DeepSeek Chat Model
**Source**: `examples/Gmail_and_Email_Automation/Effortless Email Management with AI-Powered Summarization & Review.json`  
**Workflow**: Effortless Email Management with AI

**Credentials**: `{{CREDENTIAL_deepSeekApi}}`

**Configuration**:
```json
{
  "options": {}
}
```


---

### LmChatOpenRouter
**Type**: `@n8n/n8n-nodes-langchain.lmChatOpenRouter`  
**Description**: OpenRouter proxy for multiple LLM providers through a single API key.  
**Auth Required**: `openRouterApi`  
**Usage Count**: 4 templates

#### Usage Examples

##### Example 1: LLM Response Provider (OpenRouter)
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Open Deep Research - AI-Powered Autonomous Research Workflow.json`  
**Workflow**: Open Deep Research - AI-Powered Autonomous Research Workflow

**Credentials**: `{{CREDENTIAL_openRouterApi}}`

**Configuration**:
```json
{
  "model": "google/gemini-2.0-flash-001",
  "options": {}
}
```

##### Example 2: LLM
**Source**: `examples/Google_Drive_and_Google_Sheets/Chat with your event schedule from Google Sheets in Telegram.json`  
**Workflow**: Telegram-bot AI Da Nang

**Credentials**: `{{CREDENTIAL_openRouterApi}}`

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 3: OpenRouter Chat Model
**Source**: `examples/Google_Drive_and_Google_Sheets/RAG_Context-Aware Chunking _ Google Drive to Pinecone via OpenRouter & Gemini.json`  
**Workflow**: RAG:Context-Aware Chunking | Google Drive to Pinecone via OpenRouter & Gemini

**Credentials**: `{{CREDENTIAL_openRouterApi}}`

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 4: OpenRouter LLM
**Source**: `examples/PDF_and_Document_Processing/Extract license plate number from image uploaded via an n8n form.json`  
**Workflow**: Image to license plate number

**Credentials**: `{{CREDENTIAL_openRouterApi}}`

**Configuration**:
```json
{
  "model": "={{ $json.model }}",
  "options": {}
}
```


---

### LmOllama
**Type**: `@n8n/n8n-nodes-langchain.lmOllama`  
**Description**: Completion (non-chat) Ollama model for older-style prompt completion.  
**Auth Required**: `ollamaApi`  
**Usage Count**: 2 templates

#### Usage Examples

##### Example 1: Ollama Model
**Source**: `examples/OpenAI_and_LLMs/Detect hallucinations using specialised Ollama model bespoke-minicheck.json`  
**Workflow**: Detect hallucinations using specialised Ollama model bespoke-minicheck

**Credentials**: `{{CREDENTIAL_ollamaApi}}`

**Configuration**:
```json
{
  "model": "qwen2.5:1.5b",
  "options": {}
}
```

##### Example 2: Ollama Model
**Source**: `examples/OpenAI_and_LLMs/🔐🦙🤖 Private & Local Ollama Self-Hosted AI Assistant.json`  
**Workflow**: 🗨️Ollama Chat

**Credentials**: `{{CREDENTIAL_ollamaApi}}`

**Configuration**:
```json
{
  "model": "llama3.2:latest",
  "options": {}
}
```


---

### LmOpenAi
**Type**: `@n8n/n8n-nodes-langchain.lmOpenAi`  
**Description**: OpenAI completion model (legacy). Prefer lmChatOpenAi for new workflows.  
**Auth Required**: `openAiApi`  
**Usage Count**: 2 templates

#### Usage Examples

##### Example 1: OpenAI
**Source**: `examples/OpenAI_and_LLMs/Custom LangChain agent written in JavaScript.json`  
**Workflow**: LangChain - Example - Code Node Example

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 2: OpenAI Model
**Source**: `examples/PDF_and_Document_Processing/Invoice data extraction with LlamaParse and OpenAI.json`  
**Workflow**: Invoice data extraction with LlamaParse and OpenAI

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "model": {
    "__rl": true,
    "mode": "list",
    "value": "gpt-3.5-turbo-1106",
    "cachedResultName": "gpt-3.5-turbo-1106"
  },
  "options": {
    "temperature": 0
  }
}
```

