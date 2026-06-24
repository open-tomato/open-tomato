---
tags: [n8n, langchain, rag, documents, chunking, text-splitter]
category: langchain-document-loaders
description: Load and chunk documents for embedding into vector stores
---

# LangChain Document Loaders & Text Splitters

## Overview
Load and chunk documents for embedding into vector stores.

## Nodes in This Category

---

### DocumentDefaultDataLoader
**Type**: `@n8n/n8n-nodes-langchain.documentDefaultDataLoader`  
**Description**: Loads n8n item data (JSON, text, HTML, PDF) into LangChain Document format for embedding.  
**Auth Required**: `none`  
**Usage Count**: 34 templates

#### Usage Examples

##### Example 1: Default Data Loader
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Financial Documents Assistant using Qdrant and Mistral.ai.json`  
**Workflow**: Build a Financial Documents Assistant using Qdrant and Mistral.ai

**Configuration**:
```json
{
  "options": {
    "metadata": {
      "metadataValues": [
        {
          "name": "filter_by_filename",
          "value": "={{ $json.file_location }}"
        },
        {
          "name": "filter_by_created_month",
          "value": "={{ $now.year + '-' + $now.monthShort }}"
        },
        {
          "name": "filter_by_created_week",
          "value": "={{ $now.year + '-' + $now.monthShort + '-W' + $now.weekNumber }}"
        }
      ]
    }
  },
  "jsonData": "={{ $json.data }}",
  "jsonMode": "expressionData"
}
```

##### Example 2: Default Data Loader
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Chat with GitHub API Documentation_ RAG-Powered Chatbot with Pinecone & OpenAI.json`  
**Workflow**: Chat with GitHub OpenAPI Specification using RAG (Pinecone and OpenAI)

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 3: Default Data Loader
**Source**: `examples/Database_and_Storage/Supabase Insertion & Upsertion & Retrieval.json`  
**Workflow**: Supabase Insertion & Upsertion & Retrieval

**Configuration**:
```json
{
  "loader": "epubLoader",
  "options": {},
  "dataType": "binary"
}
```

##### Example 4: Default Data Loader
**Source**: `examples/Gmail_and_Email_Automation/Effortless Email Management with AI-Powered Summarization & Review.json`  
**Workflow**: Effortless Email Management with AI

**Configuration**:
```json
{
  "options": {},
  "dataType": "binary"
}
```

##### Example 5: Default Data Loader
**Source**: `examples/Google_Drive_and_Google_Sheets/RAG Chatbot for Company Documents using Google Drive and Gemini.json`  
**Workflow**: RAG Workflow For Company Documents stored in Google Drive

**Configuration**:
```json
{
  "options": {},
  "dataType": "binary",
  "binaryMode": "specificField"
}
```


---

### DocumentBinaryInputLoader
**Type**: `@n8n/n8n-nodes-langchain.documentBinaryInputLoader`  
**Description**: Loads binary file data (PDF, DOCX) into LangChain Document format.  
**Auth Required**: `none`  
**Usage Count**: 1 templates

#### Usage Examples

##### Example 1: Binary to Document
**Source**: `examples/OpenAI_and_LLMs/AI Crew to Automate Fundamental Stock Analysis - Q&A Workflow.json`  
**Workflow**: Stock Q&A Workflow

**Configuration**:
```json
{
  "loader": "pdfLoader",
  "options": {}
}
```


---

### DocumentJsonInputLoader
**Type**: `@n8n/n8n-nodes-langchain.documentJsonInputLoader`  
**Description**: Loads JSON data into LangChain Documents with configurable metadata extraction.  
**Auth Required**: `none`  
**Usage Count**: 1 templates

#### Usage Examples

##### Example 1: Workflow Input to JSON Document
**Source**: `examples/OpenAI_and_LLMs/AI_ Summarize podcast episode and enhance using Wikipedia.json`  
**Workflow**: Podcast Digest

**Configuration**:
```json
{
  "pointers": "/transcript"
}
```


---

### TextSplitterRecursiveCharacterTextSplitter
**Type**: `@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter`  
**Description**: Splits documents into chunks using recursive character splitting. Best general-purpose splitter.  
**Auth Required**: `none`  
**Usage Count**: 26 templates

#### Usage Examples

##### Example 1: Recursive Character Text Splitter
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Financial Documents Assistant using Qdrant and Mistral.ai.json`  
**Workflow**: Build a Financial Documents Assistant using Qdrant and Mistral.ai

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 2: Recursive Character Text Splitter
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI.json`  
**Workflow**: Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI

**Configuration**:
```json
{
  "options": {},
  "chunkSize": 2000
}
```

##### Example 3: Recursive Character Text Splitter
**Source**: `examples/Google_Drive_and_Google_Sheets/RAG Chatbot for Company Documents using Google Drive and Gemini.json`  
**Workflow**: RAG Workflow For Company Documents stored in Google Drive

**Configuration**:
```json
{
  "options": {},
  "chunkOverlap": 100
}
```

##### Example 4: Recursive Character Text Splitter
**Source**: `examples/OpenAI_and_LLMs/AI Agent To Chat With Files In Supabase Storage.json`  
**Workflow**: AI Agent To Chat With Files In Supabase Storage

**Configuration**:
```json
{
  "options": {},
  "chunkSize": 500,
  "chunkOverlap": 200
}
```

##### Example 5: Recursive Character Text Splitter
**Source**: `examples/OpenAI_and_LLMs/AI_ Summarize podcast episode and enhance using Wikipedia.json`  
**Workflow**: Podcast Digest

**Configuration**:
```json
{
  "chunkSize": 6000,
  "chunkOverlap": 1000
}
```


---

### TextSplitterTokenSplitter
**Type**: `@n8n/n8n-nodes-langchain.textSplitterTokenSplitter`  
**Description**: Splits documents by token count. Use when LLM context limits are a concern.  
**Auth Required**: `none`  
**Usage Count**: 12 templates

#### Usage Examples

##### Example 1: Token Splitter
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI.json`  
**Workflow**: Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI

##### Example 2: Token Splitter
**Source**: `examples/Gmail_and_Email_Automation/Effortless Email Management with AI-Powered Summarization & Review.json`  
**Workflow**: Effortless Email Management with AI

**Configuration**:
```json
{
  "chunkSize": 300,
  "chunkOverlap": 30
}
```

##### Example 3: Token Splitter
**Source**: `examples/Notion/Upsert huge documents in a vector store with Supabase and Notion.json`  
**Workflow**: RAG on living data

**Configuration**:
```json
{
  "chunkSize": 500
}
```

##### Example 4: Token Splitter
**Source**: `examples/Notion/Notion to Pinecone Vector Store Integration.json`  
**Workflow**: Prod: Notion to Vector Store - Dimension 768

**Configuration**:
```json
{
  "chunkSize": 256,
  "chunkOverlap": 30
}
```

##### Example 5: Token Splitter
**Source**: `examples/Notion/Store Notion_s Pages as Vector Documents into Supabase with OpenAI.json`  
**Workflow**: Store Notion's Pages as Vector Documents into Supabase with OpenAI

**Configuration**:
```json
{
  "chunkSize": 256,
  "chunkOverlap": 30
}
```

