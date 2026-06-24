---
tags: [n8n, langchain, vector-store, rag, embeddings, pinecone, qdrant, supabase, pgvector]
category: langchain-vectorstores
description: Vector store integrations and embedding models for RAG pipelines
---

# LangChain Vector Stores & Embeddings

## Overview
Vector store integrations and embedding models for RAG pipelines.

## Nodes in This Category

---

### VectorStorePinecone
**Type**: `@n8n/n8n-nodes-langchain.vectorStorePinecone`  
**Description**: Pinecone vector store for similarity search. Supports insert, retrieve, and hybrid search modes.  
**Auth Required**: `pineconeApi`  
**Usage Count**: 16 templates

#### Common Operations/Modes
- `insert`
- `load`

#### Usage Examples

##### Example 1: Pinecone Vector Store
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Chat with GitHub API Documentation_ RAG-Powered Chatbot with Pinecone & OpenAI.json`  
**Workflow**: Chat with GitHub OpenAPI Specification using RAG (Pinecone and OpenAI)

**Credentials**: `{{CREDENTIAL_pineconeApi}}`

**Configuration**:
```json
{
  "mode": "insert",
  "options": {},
  "pineconeIndex": {
    "__rl": true,
    "mode": "list",
    "value": "n8n-demo",
    "cachedResultName": "n8n-demo"
  }
}
```

##### Example 2: Pinecone Vector Store (Querying)
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Chat with GitHub API Documentation_ RAG-Powered Chatbot with Pinecone & OpenAI.json`  
**Workflow**: Chat with GitHub OpenAPI Specification using RAG (Pinecone and OpenAI)

**Credentials**: `{{CREDENTIAL_pineconeApi}}`

**Configuration**:
```json
{
  "options": {},
  "pineconeIndex": {
    "__rl": true,
    "mode": "list",
    "value": "n8n-demo",
    "cachedResultName": "n8n-demo"
  }
}
```

##### Example 3: Get top chunks matching query
**Source**: `examples/PDF_and_Document_Processing/Chat with PDF docs using AI (quoting sources).json`  
**Workflow**: Chat with PDF docs using AI (quoting sources)

**Credentials**: `{{CREDENTIAL_pineconeApi}}`

**Configuration**:
```json
{
  "mode": "load",
  "topK": "={{ $json.chunks }}",
  "prompt": "={{ $json.chatInput }}",
  "options": {},
  "pineconeIndex": {
    "__rl": true,
    "mode": "list",
    "value": "test-index",
    "cachedResultName": "test-index"
  }
}
```

##### Example 4: Pinecone Vector Store
**Source**: `examples/Google_Drive_and_Google_Sheets/RAG Chatbot for Company Documents using Google Drive and Gemini.json`  
**Workflow**: RAG Workflow For Company Documents stored in Google Drive

**Credentials**: `{{CREDENTIAL_pineconeApi}}`

**Configuration**:
```json
{
  "mode": "insert",
  "options": {},
  "pineconeIndex": {
    "__rl": true,
    "mode": "list",
    "value": "company-files",
    "cachedResultName": "company-files"
  }
}
```

##### Example 5: Pinecone Vector Store (Retrieval)
**Source**: `examples/Google_Drive_and_Google_Sheets/RAG Chatbot for Company Documents using Google Drive and Gemini.json`  
**Workflow**: RAG Workflow For Company Documents stored in Google Drive

**Credentials**: `{{CREDENTIAL_pineconeApi}}`

**Configuration**:
```json
{
  "options": {},
  "pineconeIndex": {
    "__rl": true,
    "mode": "list",
    "value": "company-files",
    "cachedResultName": "company-files"
  }
}
```


---

### VectorStoreQdrant
**Type**: `@n8n/n8n-nodes-langchain.vectorStoreQdrant`  
**Description**: Qdrant vector store for similarity search. Supports insert, retrieve, and delete operations.  
**Auth Required**: `qdrantApi`  
**Usage Count**: 26 templates

#### Common Operations/Modes
- `insert`
- `load`
- `retrieve-as-tool`

#### Usage Examples

##### Example 1: Qdrant Vector Store
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Financial Documents Assistant using Qdrant and Mistral.ai.json`  
**Workflow**: Build a Financial Documents Assistant using Qdrant and Mistral.ai

**Credentials**: `{{CREDENTIAL_qdrantApi}}`

**Configuration**:
```json
{
  "mode": "insert",
  "options": {},
  "qdrantCollection": {
    "__rl": true,
    "mode": "id",
    "value": "={{ $('Set Variables').item.json.qdrant_collection }}"
  }
}
```

##### Example 2: Qdrant Vector Store1
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Financial Documents Assistant using Qdrant and Mistral.ai.json`  
**Workflow**: Build a Financial Documents Assistant using Qdrant and Mistral.ai

**Credentials**: `{{CREDENTIAL_qdrantApi}}`

**Configuration**:
```json
{
  "qdrantCollection": {
    "__rl": true,
    "mode": "id",
    "value": "BankStatements"
  }
}
```

##### Example 3: Qdrant Vector Store
**Source**: `examples/Gmail_and_Email_Automation/AI-powered email processing autoresponder and response approval (Yes_No).json`  
**Workflow**: AI Email processing autoresponder with approval (Yes/No)

**Credentials**: `{{CREDENTIAL_qdrantApi}}`

**Configuration**:
```json
{
  "mode": "retrieve-as-tool",
  "options": {},
  "toolName": "company_knowladge_base",
  "toolDescription": "Extracts information regarding the request made.",
  "qdrantCollection": {
    "__rl": true,
    "mode": "id",
    "value": "=COLLECTION"
  },
  "includeDocumentMetadata": false
}
```

##### Example 4: Qdrant Vector Store
**Source**: `examples/OpenAI_and_LLMs/AI Voice Chatbot with ElevenLabs & OpenAI for Customer Service and Restaurants.json`  
**Workflow**: Voice RAG Chatbot with ElevenLabs and OpenAI

**Credentials**: `{{CREDENTIAL_qdrantApi}}`

**Configuration**:
```json
{
  "options": {},
  "qdrantCollection": {
    "__rl": true,
    "mode": "id",
    "value": "=COLLECTION"
  }
}
```

##### Example 5: Search in Relevant Docs
**Source**: `examples/Other_Integrations_and_Use_Cases/API Schema Extractor.json`  
**Workflow**: API Schema Extractor

**Configuration**:
```json
{
  "mode": "load",
  "topK": 5,
  "prompt": "={{ $json.query }}",
  "options": {
    "searchFilterJson": "={{\n{\n \"must\": [\n {\n \"key\": \"metadata.service\",\n \"match\": {\n \"value\": $('EventRouter').first().json.data.service\n }\n }\n ]\n}\n}}"
  },
  "qdrantCollection": {
    "__rl": true,
    "mode": "id",
    "value": "={{ $('EventRouter').first().json.data.collection }}"
  }
}
```


---

### VectorStoreSupabase
**Type**: `@n8n/n8n-nodes-langchain.vectorStoreSupabase`  
**Description**: Supabase pgvector extension as a vector store. Requires a table with an embedding column.  
**Auth Required**: `supabaseApi`  
**Usage Count**: 13 templates

#### Common Operations/Modes
- `insert`
- `load`
- `update`

#### Usage Examples

##### Example 1: Retrieve by Query
**Source**: `examples/Database_and_Storage/Supabase Insertion & Upsertion & Retrieval.json`  
**Workflow**: Supabase Insertion & Upsertion & Retrieval

**Configuration**:
```json
{
  "options": {
    "queryName": "match_documents"
  },
  "tableName": {
    "__rl": true,
    "mode": "list",
    "value": "Kadampa",
    "cachedResultName": "Kadampa"
  }
}
```

##### Example 2: Insert Documents
**Source**: `examples/Database_and_Storage/Supabase Insertion & Upsertion & Retrieval.json`  
**Workflow**: Supabase Insertion & Upsertion & Retrieval

**Configuration**:
```json
{
  "mode": "insert",
  "options": {},
  "tableName": {
    "__rl": true,
    "mode": "list",
    "value": "Kadampa",
    "cachedResultName": "Kadampa"
  }
}
```

##### Example 3: Update Documents
**Source**: `examples/Database_and_Storage/Supabase Insertion & Upsertion & Retrieval.json`  
**Workflow**: Supabase Insertion & Upsertion & Retrieval

**Configuration**:
```json
{
  "mode": "update",
  "options": {
    "queryName": "match_documents"
  },
  "tableName": {
    "__rl": true,
    "mode": "list",
    "value": "n8n",
    "cachedResultName": "n8n"
  }
}
```

##### Example 4: Supabase - Retrieve documents from chatinput
**Source**: `examples/WordPress/WordPress - AI Chatbot to enhance user experience - with Supabase and OpenAI.json`  
**Workflow**: RAG & GenAI App With WordPress Content

**Configuration**:
```json
{
  "mode": "load",
  "prompt": "={{ $json.chatInput }}",
  "options": {},
  "tableName": {
    "__rl": true,
    "mode": "list",
    "value": "documents",
    "cachedResultName": "documents"
  }
}
```

##### Example 5: Supabase Vector Store
**Source**: `examples/HR_and_Recruitment/BambooHR AI-Powered Company Policies and Benefits Chatbot.json`  
**Workflow**: BambooHR AI-Powered Company Policies and Benefits Chatbot

**Credentials**: `{{CREDENTIAL_supabaseApi}}`

**Configuration**:
```json
{
  "mode": "insert",
  "options": {
    "queryName": "match_files"
  },
  "tableName": {
    "__rl": true,
    "mode": "list",
    "value": "company_files",
    "cachedResultName": "company_files"
  }
}
```


---

### VectorStorePGVector
**Type**: `@n8n/n8n-nodes-langchain.vectorStorePGVector`  
**Description**: Native PostgreSQL pgvector extension. Lower-level than Supabase vector store.  
**Auth Required**: `postgres`  
**Usage Count**: 2 templates

#### Common Operations/Modes
- `insert`

#### Usage Examples

##### Example 1: Create HR Policies
**Source**: `examples/HR_and_Recruitment/HR & IT Helpdesk Chatbot with Audio Transcription.json`  
**Workflow**: HR & IT Helpdesk Chatbot with Audio Transcription

**Credentials**: `{{CREDENTIAL_postgres}}`

**Configuration**:
```json
{
  "mode": "insert",
  "options": {}
}
```

##### Example 2: Postgres PGVector Store
**Source**: `examples/HR_and_Recruitment/HR & IT Helpdesk Chatbot with Audio Transcription.json`  
**Workflow**: HR & IT Helpdesk Chatbot with Audio Transcription

**Credentials**: `{{CREDENTIAL_postgres}}`

**Configuration**:
```json
{
  "options": {}
}
```


---

### VectorStoreInMemory
**Type**: `@n8n/n8n-nodes-langchain.vectorStoreInMemory`  
**Description**: Ephemeral in-memory vector store. Useful for testing or single-run document QA.  
**Auth Required**: `none`  
**Usage Count**: 6 templates

#### Common Operations/Modes
- `insert`
- `load`
- `retrieve-as-tool`

#### Usage Examples

##### Example 1: In-Memory Vector Store
**Source**: `examples/OpenAI_and_LLMs/Generating Image Embeddings via Textual Summarisation.json`  
**Workflow**: Generating Image Embeddings via Textual Summarisation

**Configuration**:
```json
{
  "mode": "insert",
  "memoryKey": "image_embeddings"
}
```

##### Example 2: Search for Image
**Source**: `examples/OpenAI_and_LLMs/Generating Image Embeddings via Textual Summarisation.json`  
**Workflow**: Generating Image Embeddings via Textual Summarisation

**Configuration**:
```json
{
  "mode": "load",
  "prompt": "student having fun",
  "memoryKey": "image_embeddings"
}
```

##### Example 3: Retrieve documents
**Source**: `examples/Telegram/TeleBot_KnowledgeHub.json`  
**Workflow**: TeleBot_KnowledgeHub

**Configuration**:
```json
{
  "mode": "retrieve-as-tool",
  "toolDescription": "Use this tool to retrieve any information required.",
  "memoryKey": {
    "__rl": true,
    "value": "vector_store_key",
    "mode": "list",
    "cachedResultName": "vector_store_key"
  },
  "topK": 10
}
```

##### Example 4: Product Catalogue
**Source**: `examples/WhatsApp/Building Your First WhatsApp Chatbot.json`  
**Workflow**: Building Your First WhatsApp Chatbot

**Configuration**:
```json
{
  "memoryKey": "whatsapp-75"
}
```

##### Example 5: Create Product Catalogue
**Source**: `examples/WhatsApp/Building Your First WhatsApp Chatbot.json`  
**Workflow**: Building Your First WhatsApp Chatbot

**Configuration**:
```json
{
  "mode": "insert",
  "memoryKey": "whatsapp-75",
  "clearStore": true
}
```


---

### EmbeddingsOpenAi
**Type**: `@n8n/n8n-nodes-langchain.embeddingsOpenAi`  
**Description**: OpenAI text-embedding models. Use text-embedding-3-small (default) or text-embedding-ada-002.  
**Auth Required**: `openAiApi`  
**Usage Count**: 46 templates

#### Usage Examples

##### Example 1: Embeddings OpenAI
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI.json`  
**Workflow**: Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "model": "text-embedding-3-small",
  "options": {}
}
```

##### Example 2: Generate User Query Embedding
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Chat with GitHub API Documentation_ RAG-Powered Chatbot with Pinecone & OpenAI.json`  
**Workflow**: Chat with GitHub OpenAPI Specification using RAG (Pinecone and OpenAI)

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 3: Generate Embeddings
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Chat with GitHub API Documentation_ RAG-Powered Chatbot with Pinecone & OpenAI.json`  
**Workflow**: Chat with GitHub OpenAPI Specification using RAG (Pinecone and OpenAI)

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 4: Embeddings OpenAI
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Customer Insights with Qdrant, Python and Information Extractor.json`  
**Workflow**: Customer Insights with Qdrant, Python and Information Extractor

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "model": "text-embedding-3-small",
  "options": {}
}
```

##### Example 5: Embeddings OpenAI
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Survey Insights with Qdrant, Python and Information Extractor.json`  
**Workflow**: Survey Insights with Qdrant, Python and Information Extractor

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "model": "text-embedding-3-small",
  "options": {}
}
```


---

### EmbeddingsGoogleGemini
**Type**: `@n8n/n8n-nodes-langchain.embeddingsGoogleGemini`  
**Description**: Google Gemini embedding models via Vertex AI.  
**Auth Required**: `googlePalmApi`  
**Usage Count**: 9 templates

#### Usage Examples

##### Example 1: Embeddings Google Gemini
**Source**: `examples/Google_Drive_and_Google_Sheets/RAG Chatbot for Company Documents using Google Drive and Gemini.json`  
**Workflow**: RAG Workflow For Company Documents stored in Google Drive

**Credentials**: `{{CREDENTIAL_googlePalmApi}}`

**Configuration**:
```json
{
  "modelName": "models/text-embedding-004"
}
```

##### Example 2: Embeddings Google Gemini (retrieval)
**Source**: `examples/Google_Drive_and_Google_Sheets/RAG Chatbot for Company Documents using Google Drive and Gemini.json`  
**Workflow**: RAG Workflow For Company Documents stored in Google Drive

**Credentials**: `{{CREDENTIAL_googlePalmApi}}`

**Configuration**:
```json
{
  "modelName": "models/text-embedding-004"
}
```

##### Example 3: Embeddings Google Gemini
**Source**: `examples/Google_Drive_and_Google_Sheets/RAG_Context-Aware Chunking _ Google Drive to Pinecone via OpenRouter & Gemini.json`  
**Workflow**: RAG:Context-Aware Chunking | Google Drive to Pinecone via OpenRouter & Gemini

**Credentials**: `{{CREDENTIAL_googlePalmApi}}`

**Configuration**:
```json
{
  "modelName": "models/text-embedding-004"
}
```

##### Example 4: Embeddings Google Gemini
**Source**: `examples/Notion/Notion to Pinecone Vector Store Integration.json`  
**Workflow**: Prod: Notion to Vector Store - Dimension 768

**Credentials**: `{{CREDENTIAL_googlePalmApi}}`

**Configuration**:
```json
{
  "modelName": "models/text-embedding-004"
}
```

##### Example 5: Embeddings Google Gemini
**Source**: `examples/OpenAI_and_LLMs/AI-Powered RAG Workflow For Stock Earnings Report Analysis.json`  
**Workflow**: RAG Workflow For Stock Earnings Report Analysis

**Credentials**: `{{CREDENTIAL_googlePalmApi}}`

**Configuration**:
```json
{
  "modelName": "models/text-embedding-004"
}
```


---

### EmbeddingsHuggingFaceInference
**Type**: `@n8n/n8n-nodes-langchain.embeddingsHuggingFaceInference`  
**Description**: HuggingFace Inference API for open-source embedding models.  
**Auth Required**: `huggingFaceApi`  
**Usage Count**: 2 templates

#### Usage Examples

##### Example 1: Embeddings HuggingFace Inference
**Source**: `examples/Telegram/TeleBot_KnowledgeHub.json`  
**Workflow**: TeleBot_KnowledgeHub

**Credentials**: `{{CREDENTIAL_huggingFaceApi}}`

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 2: Embeddings HuggingFace Inference1
**Source**: `examples/Telegram/TeleBot_KnowledgeHub.json`  
**Workflow**: TeleBot_KnowledgeHub

**Credentials**: `{{CREDENTIAL_huggingFaceApi}}`

**Configuration**:
```json
{
  "options": {}
}
```


---

### EmbeddingsMistralCloud
**Type**: `@n8n/n8n-nodes-langchain.embeddingsMistralCloud`  
**Description**: Mistral AI embedding model (mistral-embed).  
**Auth Required**: `mistralCloudApi`  
**Usage Count**: 5 templates

#### Usage Examples

##### Example 1: Embeddings Mistral Cloud
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Financial Documents Assistant using Qdrant and Mistral.ai.json`  
**Workflow**: Build a Financial Documents Assistant using Qdrant and Mistral.ai

**Credentials**: `{{CREDENTIAL_mistralCloudApi}}`

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 2: Embeddings Mistral Cloud1
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Financial Documents Assistant using Qdrant and Mistral.ai.json`  
**Workflow**: Build a Financial Documents Assistant using Qdrant and Mistral.ai

**Credentials**: `{{CREDENTIAL_mistralCloudApi}}`

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 3: Embeddings Mistral Cloud
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI.json`  
**Workflow**: Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI

**Credentials**: `{{CREDENTIAL_mistralCloudApi}}`

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 4: Embeddings Mistral Cloud
**Source**: `examples/PDF_and_Document_Processing/Breakdown Documents into Study Notes using Templating MistralAI and Qdrant.json`  
**Workflow**: Breakdown Documents into Study Notes using Templating MistralAI and Qdrant

**Credentials**: `{{CREDENTIAL_mistralCloudApi}}`

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 5: Embeddings Mistral Cloud1
**Source**: `examples/PDF_and_Document_Processing/Breakdown Documents into Study Notes using Templating MistralAI and Qdrant.json`  
**Workflow**: Breakdown Documents into Study Notes using Templating MistralAI and Qdrant

**Credentials**: `{{CREDENTIAL_mistralCloudApi}}`

**Configuration**:
```json
{
  "options": {}
}
```


---

### RetrieverVectorStore
**Type**: `@n8n/n8n-nodes-langchain.retrieverVectorStore`  
**Description**: Wraps a vector store as a retriever sub-node for use in chainRetrievalQa.  
**Auth Required**: `none`  
**Usage Count**: 8 templates

#### Usage Examples

##### Example 1: Vector Store Retriever
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Financial Documents Assistant using Qdrant and Mistral.ai.json`  
**Workflow**: Build a Financial Documents Assistant using Qdrant and Mistral.ai

##### Example 2: Vector Store Retriever
**Source**: `examples/Database_and_Storage/Supabase Insertion & Upsertion & Retrieval.json`  
**Workflow**: Supabase Insertion & Upsertion & Retrieval

**Configuration**:
```json
{
  "topK": 10
}
```

##### Example 3: Vector Store Retriever
**Source**: `examples/Notion/Upsert huge documents in a vector store with Supabase and Notion.json`  
**Workflow**: RAG on living data

##### Example 4: Vector Store Retriever
**Source**: `examples/OpenAI_and_LLMs/AI Crew to Automate Fundamental Stock Analysis - Q&A Workflow.json`  
**Workflow**: Stock Q&A Workflow

**Configuration**:
```json
{
  "topK": 5
}
```

##### Example 5: Vector Store Retriever
**Source**: `examples/OpenAI_and_LLMs/Advanced AI Demo (Presented at AI Developers #14 meetup).json`  
**Workflow**: Advanced AI Demo (Presented at AI Developers #14 meetup)


---

### RetrieverWorkflow
**Type**: `@n8n/n8n-nodes-langchain.retrieverWorkflow`  
**Description**: Uses a sub-workflow as a retriever for custom retrieval logic.  
**Auth Required**: `none`  
**Usage Count**: 1 templates

#### Usage Examples

##### Example 1: Workflow Retriever
**Source**: `examples/OpenAI_and_LLMs/AI_ Ask questions about any data source (using the n8n workflow retriever).json`  
**Workflow**: LangChain - Example - Workflow Retriever

**Configuration**:
```json
{
  "workflowId": "QacfBRBnf1xOyckC"
}
```

