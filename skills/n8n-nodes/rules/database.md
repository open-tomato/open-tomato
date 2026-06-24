---
tags: [n8n, database, postgres, mysql, mongodb, redis, supabase, storage]
category: database
description: SQL and NoSQL database operations, key-value stores, and cloud storage
---

# Databases & Storage

## Overview
SQL and NoSQL database operations, key-value stores, and cloud storage.

## Nodes in This Category

---

### Postgres
**Type**: `n8n-nodes-base.postgres`  
**Description**: Execute queries, insert, update, delete and upsert rows in PostgreSQL.  
**Auth Required**: `postgres`  
**Usage Count**: 8 templates

#### Common Operations/Modes
- `executeQuery`
- `select`

#### Usage Examples

##### Example 1: Check Data on Database Is Exist
**Source**: `examples/Instagram_Twitter_Social_Media/Generate Instagram Content from Top Trends with AI Image Generation.json`  
**Workflow**: Generate Instagram Content from Top Trends with AI Image Generation

**Credentials**: `{{CREDENTIAL_postgres}}`

**Configuration**:
```json
{
  "table": {
    "__rl": true,
    "mode": "list",
    "value": "top_trends",
    "cachedResultName": "top_trends"
  },
  "where": {
    "values": [
      {
        "value": "={{$json.content_code}}",
        "column": "code"
      }
    ]
  },
  "schema": {
    "__rl": true,
    "mode": "list",
    "value": "public",
    "cachedResultName": "public"
  },
  "options": {},
  "operation": "select"
}
```

##### Example 2: insert data on db
**Source**: `examples/Instagram_Twitter_Social_Media/Generate Instagram Content from Top Trends with AI Image Generation.json`  
**Workflow**: Generate Instagram Content from Top Trends with AI Image Generation

**Credentials**: `{{CREDENTIAL_postgres}}`

**Configuration**:
```json
{
  "table": {
    "__rl": true,
    "mode": "list",
    "value": "top_trends",
    "cachedResultName": "top_trends"
  },
  "schema": {
    "__rl": true,
    "mode": "list",
    "value": "public"
  },
  "columns": {
    "value": {
      "tag": "={{$('Loop Over Items').item.json.tag}}",
      "code": "={{$('Loop Over Items').item.json.content_code}}",
      "prompt": "={{$('Loop Over Items').item.json.prompt}}",
      "isposted": false,
      "thumbnail_url": "={{$('Loop Over Items').item.json.thumbnail_url}}"
    },
    "schema": [
      {
        "type": "number",
        "display": true,
        "removed": true,
        "required": false,
        "displayName": "id",
        "defaultMatch": true,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "required": true,
        "displayName": "prompt",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "boolean",
        "display": true,
        "required": false,
        "displayName": "isposted",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "dateTime",
        "display": true,
        "removed": true,
        "required": false,
        "displayName": "createdat",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "dateTime",
        "display": true,
        "removed": true,
        "required": false,
        "displayName": "updatedat",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "dateTime",
        "display": true,
        "removed": true,
        "required": false,
        "displayName": "deletedat",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "required": false,
        "displayName": "code",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {

```

##### Example 3: Insert Transcription Part
**Source**: `examples/OpenAI_and_LLMs/AI Agent for realtime insights on meetings.json`  
**Workflow**: AI Agent for realtime insights on meetings

**Credentials**: `{{CREDENTIAL_postgres}}`

**Configuration**:
```json
{
  "query": "UPDATE public.data\nSET output = jsonb_set(\n output,\n '{dialog}', \n (\n COALESCE(\n (output->'dialog')::jsonb, \n '[]'::jsonb -- Initialize as empty array if dialog does not exist\n ) || jsonb_build_object(\n 'order', (COALESCE(jsonb_array_length(output->'dialog'), 0) + 1), -- Calculate the next order\n 'words', '{{ $('Webhook2').item.json.body.data.transcript.words.map(word => word.text.replace(/'/g, \"''\")).join(\" \") }}',\n 'speaker', '{{ $('Webhook2').item.json.body.data.transcript.speaker }}',\n 'language', '{{ $('Webhook2').item.json.body.data.transcript.language }}',\n 'speaker_id', ('{{ $('Webhook2').item.json.body.data.transcript.speaker_id }}')::int,\n 'date_updated', to_jsonb('{{ $now }}'::text)\n )\n )\n)\nWHERE input->>'recall_bot_id' = $1\nReturning input->>'openai_thread_id' as thread_id;",
  "options": {
    "queryReplacement": "={{ $('Scenario 2 Start - Webhook').item.json.body.data.bot_id }}"
  },
  "operation": "executeQuery"
}
```

##### Example 4: Postgres
**Source**: `examples/PDF_and_Document_Processing/ETL pipeline for text processing.json`  
**Workflow**: ETL pipeline

**Credentials**: `{{CREDENTIAL_postgres}}`

**Configuration**:
```json
{
  "table": "tweets",
  "columns": "text, score, magnitude",
  "returnFields": "=*"
}
```

##### Example 5: Postgres
**Source**: `examples/WordPress/WordPress - AI Chatbot to enhance user experience - with Supabase and OpenAI.json`  
**Workflow**: RAG & GenAI App With WordPress Content

**Configuration**:
```json
{
  "query": "select max(created_at) as last_workflow_execution from n8n_website_embedding_histories",
  "options": {},
  "operation": "executeQuery"
}
```


---

### PostgresTool
**Type**: `n8n-nodes-base.postgresTool`  
**Description**: Wraps PostgreSQL operations as an AI agent tool.  
**Auth Required**: `postgres`  
**Usage Count**: 7 templates

#### Common Operations/Modes
- `executeQuery`

#### Usage Examples

##### Example 1: Get Table Definition
**Source**: `examples/Database_and_Storage/Chat with Postgresql Database.json`  
**Workflow**: Chat with Postgresql Database

**Credentials**: `{{CREDENTIAL_postgres}}`

**Configuration**:
```json
{
  "query": "select\n c.column_name,\n c.data_type,\n c.is_nullable,\n c.column_default,\n tc.constraint_type,\n ccu.table_name AS referenced_table,\n ccu.column_name AS referenced_column\nfrom\n information_schema.columns c\nLEFT join\n information_schema.key_column_usage kcu\n ON c.table_name = kcu.table_name\n AND c.column_name = kcu.column_name\nLEFT join\n information_schema.table_constraints tc\n ON kcu.constraint_name = tc.constraint_name\n AND tc.constraint_type = 'FOREIGN KEY'\nLEFT join\n information_schema.constraint_column_usage ccu\n ON tc.constraint_name = ccu.constraint_name\nwhere\n c.table_name = '{{ $fromAI(\"table_name\") }}'\n AND c.table_schema = '{{ $fromAI(\"schema_name\") }}'\norder by\n c.ordinal_position",
  "options": {},
  "operation": "executeQuery",
  "descriptionType": "manual",
  "toolDescription": "Get table definition to find all columns and types"
}
```

##### Example 2: Execute SQL Query
**Source**: `examples/Database_and_Storage/Chat with Postgresql Database.json`  
**Workflow**: Chat with Postgresql Database

**Credentials**: `{{CREDENTIAL_postgres}}`

**Configuration**:
```json
{
  "query": "{{ $fromAI(\"sql_query\", \"SQL Query\") }}",
  "options": {},
  "operation": "executeQuery",
  "descriptionType": "manual",
  "toolDescription": "Get all the data from Postgres, make sure you append the tables with correct schema. Every table is associated with some schema in the database."
}
```

##### Example 3: Get DB Schema and Tables List
**Source**: `examples/Database_and_Storage/Chat with Postgresql Database.json`  
**Workflow**: Chat with Postgresql Database

**Credentials**: `{{CREDENTIAL_postgres}}`

**Configuration**:
```json
{
  "query": "SELECT \n table_schema,\n table_name\nFROM information_schema.tables\nWHERE table_type = 'BASE TABLE'\n AND table_schema NOT IN ('pg_catalog', 'information_schema')\nORDER BY table_schema, table_name;",
  "options": {},
  "operation": "executeQuery",
  "descriptionType": "manual",
  "toolDescription": "Get list of all tables with their schema in the database"
}
```

##### Example 4: Create Note
**Source**: `examples/OpenAI_and_LLMs/AI Agent for realtime insights on meetings.json`  
**Workflow**: AI Agent for realtime insights on meetings

**Credentials**: `{{CREDENTIAL_postgres}}`

**Configuration**:
```json
{
  "query": "UPDATE public.data\nSET output = jsonb_set(\n output,\n '{notes}', \n (\n COALESCE(\n (output->'notes')::jsonb, \n '[]'::jsonb -- Initialize as empty array if dialog does not exist\n ) || jsonb_build_object(\n 'order', (COALESCE(jsonb_array_length(output->'notes'), 0) + 1), -- Calculate the next order\n 'text', '{{ $fromAI(\"note\",\"Text of note.\") }}'\n )\n )\n)\nWHERE input->>'recall_bot_id' = $1",
  "options": {
    "queryReplacement": "={{ $('Scenario 2 Start - Webhook').item.json.body.data.bot_id }}"
  },
  "operation": "executeQuery",
  "descriptionType": "manual",
  "toolDescription": "Create note record."
}
```

##### Example 5: DB Schema
**Source**: `examples/OpenAI_and_LLMs/AI Agent to chat with Supabase_PostgreSQL DB.json`  
**Workflow**: AI Agent to chat with Supabase_PostgreSQL DB

**Credentials**: `{{CREDENTIAL_postgres}}`

**Configuration**:
```json
{
  "query": "SELECT table_schema, table_name\nFROM information_schema.tables\nWHERE table_type = 'BASE TABLE' AND table_schema = 'public';",
  "options": {},
  "operation": "executeQuery",
  "descriptionType": "manual",
  "toolDescription": "Get list of all tables in database"
}
```


---

### MySql
**Type**: `n8n-nodes-base.mySql`  
**Description**: Execute queries and manage MySQL/MariaDB databases.  
**Auth Required**: `mySql`  
**Usage Count**: 3 templates

#### Common Operations/Modes
- `executeQuery`

#### Usage Examples

##### Example 1: List all tables in a database
**Source**: `examples/Database_and_Storage/Generate SQL queries from schema only - AI-powered.json`  
**Workflow**: Generate SQL queries from schema only - AI-powered

**Credentials**: `{{CREDENTIAL_mySql}}`

**Configuration**:
```json
{
  "query": "SHOW TABLES;",
  "options": {},
  "operation": "executeQuery"
}
```

##### Example 2: Extract database schema
**Source**: `examples/Database_and_Storage/Generate SQL queries from schema only - AI-powered.json`  
**Workflow**: Generate SQL queries from schema only - AI-powered

**Credentials**: `{{CREDENTIAL_mySql}}`

**Configuration**:
```json
{
  "query": "DESCRIBE {{ $json.Tables_in_tttytdb2023 }};",
  "options": {},
  "operation": "executeQuery"
}
```

##### Example 3: Run SQL query
**Source**: `examples/Database_and_Storage/Generate SQL queries from schema only - AI-powered.json`  
**Workflow**: Generate SQL queries from schema only - AI-powered

**Credentials**: `{{CREDENTIAL_mySql}}`

**Configuration**:
```json
{
  "query": "{{ $json.query }}",
  "options": {},
  "operation": "executeQuery"
}
```


---

### MySqlTool
**Type**: `n8n-nodes-base.mySqlTool`  
**Description**: n8n node for mySqlTool operations.  
**Auth Required**: `mySql`  
**Usage Count**: 1 templates

#### Common Operations/Modes
- `executeQuery`

#### Usage Examples

##### Example 1: Products in Daatabase
**Source**: `examples/OpenAI_and_LLMs/Chat Assistant (OpenAI assistant) with Postgres Memory And API Calling Capabalities.json`  
**Workflow**: modelo do chatbot

**Credentials**: `{{CREDENTIAL_mySql}}`

**Configuration**:
```json
{
  "query": "SELECT * \nFROM Products p \nWHERE \n cityQuery = '{{ $fromAI(\"cityQuery\") }}' AND \n state = '{{ $fromAI(\"state\") }}' AND \n modality = 'PME' AND \n removed = 0 AND \n ({{ $fromAI(\"holderCount\") || 1 }} + {{ $fromAI(\"dependentsCount\") || 0 }}) BETWEEN p.minLifeAmount AND p.maxLifeAmount AND\n (CASE\n WHEN {{ $fromAI(\"holderAge\") }} BETWEEN 0 AND 18 THEN priceAtAge0To18\n WHEN {{ $fromAI(\"holderAge\") }} BETWEEN 19 AND 23 THEN priceAtAge19To23\n WHEN {{ $fromAI(\"holderAge\") }} BETWEEN 24 AND 28 THEN priceAtAge24To28\n WHEN {{ $fromAI(\"holderAge\") }} BETWEEN 29 AND 33 THEN priceAtAge29To33\n WHEN {{ $fromAI(\"holderAge\") }} BETWEEN 34 AND 38 THEN priceAtAge34To38\n WHEN {{ $fromAI(\"holderAge\") }} BETWEEN 39 AND 43 THEN priceAtAge39To43\n WHEN {{ $fromAI(\"holderAge\") }} BETWEEN 44 AND 48 THEN priceAtAge44To48\n WHEN {{ $fromAI(\"holderAge\") }} BETWEEN 49 AND 53 THEN priceAtAge49To53\n WHEN {{ $fromAI(\"holderAge\") }} BETWEEN 54 AND 58 THEN priceAtAge54To58\n ELSE priceAtAge59To199\n END) IS NOT NULL\nORDER BY \n (CASE\n WHEN {{ $fromAI(\"holderAge\") }} BETWEEN 0 AND 18 THEN priceAtAge0To18\n WHEN {{ $fromAI(\"holderAge\") }} BETWEEN 19 AND 23 THEN priceAtAge19To23\n WHEN {{ $fromAI(\"holderAge\") }} BETWEEN 24 AND 28 THEN priceAtAge24To28\n WHEN {{ $fromAI(\"holderAge\") }} BETWEEN 29 AND 33 THEN priceAtAge29To33\n WHEN {{ $fromAI(\"holderAge\") }} BETWEEN 34 AND 38 THEN priceAtAge34To38\n WHEN {{ $fromAI(\"holderAge\") }} BETWEEN 39 AND 43 THEN priceAtAge39To43\n WHEN {{ $fromAI(\"holderAge\") }} BETWEEN 44 AND 48 THEN priceAtAge44To48\n WHEN {{ $fromAI(\"holderAge\") }} BETWEEN 49 AND 53 THEN priceAtAge49To53\n WHEN {{ $fromAI(\"holderAge\") }} BETWEEN 54 AND 58 THEN priceAtAge54To58\n ELSE priceAtAge59To199\n END) ASC, \n createdAt DESC\nLIMIT 3;\n",
  "options": {
    "detailedOutput": true
  },
  "operation": "executeQuery",
  "descriptionType": "manual",
  "toolDescription": "// Search for the X product bla bla bla"
}
```


---

### MongoDb
**Type**: `n8n-nodes-base.mongoDb`  
**Description**: Find, insert, update and delete documents in MongoDB.  
**Auth Required**: `mongoDb`  
**Usage Count**: 1 templates

#### Common Operations/Modes
- `insert`

#### Usage Examples

##### Example 1: MongoDB
**Source**: `examples/PDF_and_Document_Processing/ETL pipeline for text processing.json`  
**Workflow**: ETL pipeline

**Credentials**: `{{CREDENTIAL_mongoDb}}`

**Configuration**:
```json
{
  "fields": "text",
  "options": {},
  "operation": "insert",
  "collection": "tweets"
}
```


---

### MongoDbTool
**Type**: `n8n-nodes-base.mongoDbTool`  
**Description**: n8n node for mongoDbTool operations.  
**Auth Required**: `mongoDb`  
**Usage Count**: 1 templates

#### Common Operations/Modes
- `aggregate`

#### Usage Examples

##### Example 1: MongoDBAggregate
**Source**: `examples/Database_and_Storage/MongoDB AI Agent - Intelligent Movie Recommendations.json`  
**Workflow**: MongoDB Agent

**Credentials**: `{{CREDENTIAL_mongoDb}}`

**Configuration**:
```json
{
  "query": "={{ $fromAI(\"pipeline\", \"The MongoDB pipeline to execute\" , \"string\" , [{\"$match\" : { \"rating\" : 5 } }])}}",
  "operation": "aggregate",
  "collection": "movies",
  "descriptionType": "manual",
  "toolDescription": "Get from AI the MongoDB Aggregation pipeline to get context based on the provided pipeline, the document structure of the documents is : {\n \"plot\": \"A group of bandits stage a brazen train hold-up, only to find a determined posse hot on their heels.\",\n \"genres\": [\n \"Short\",\n \"Western\"\n ],\n \"runtime\": 11,\n \"cast\": [\n \"A.C. Abadie\",\n \"Gilbert M. 'Broncho Billy' Anderson\",\n ...\n ],\n \"poster\": \"...jpg\",\n \"title\": \"The Great Train Robbery\",\n \"fullplot\": \"Among the earliest existing films in American cinema - notable as the ...\",\n \"languages\": [\n \"English\"\n ],\n \"released\": \"date\"\n },\n \"directors\": [\n \"Edwin S. Porter\"\n ],\n \"rated\": \"TV-G\",\n \"awards\": {\n \"wins\": 1,\n \"nominations\": 0,\n \"text\": \"1 win.\"\n },\n \"lastupdated\": \"2015-08-13 00:27:59.177000000\",\n \"year\": 1903,\n \"imdb\": {\n \"rating\": 7.4,"
}
```


---

### Redis
**Type**: `n8n-nodes-base.redis`  
**Description**: Get, set, delete keys and publish messages in Redis.  
**Auth Required**: `redis`  
**Usage Count**: 8 templates

#### Common Operations/Modes
- `get`
- `push`
- `set`

#### Usage Examples

##### Example 1: Create Session
**Source**: `examples/Forms_and_Surveys/Conversational Interviews with AI Agents and n8n Forms.json`  
**Workflow**: Conversational Interviews with AI Agents and n8n Forms

**Credentials**: `{{CREDENTIAL_redis}}`

**Configuration**:
```json
{
  "key": "=session_{{ $('UUID').item.json.data }}",
  "ttl": "={{ 60 * 60 * 24 }}",
  "value": "={{ [] }}",
  "expire": true,
  "keyType": "list",
  "operation": "set"
}
```

##### Example 2: Update Session
**Source**: `examples/Forms_and_Surveys/Conversational Interviews with AI Agents and n8n Forms.json`  
**Workflow**: Conversational Interviews with AI Agents and n8n Forms

**Credentials**: `{{CREDENTIAL_redis}}`

**Configuration**:
```json
{
  "list": "=session_{{ $('UUID').first().json.data }}",
  "tail": true,
  "operation": "push",
  "messageData": "={{ $json.toJsonString() }}"
}
```

##### Example 3: Query By Session
**Source**: `examples/Forms_and_Surveys/Conversational Interviews with AI Agents and n8n Forms.json`  
**Workflow**: Conversational Interviews with AI Agents and n8n Forms

**Credentials**: `{{CREDENTIAL_redis}}`

**Configuration**:
```json
{
  "key": "=session_{{ $('Webhook').first().json.params.session_id }}",
  "options": {},
  "operation": "get",
  "propertyName": "data"
}
```

##### Example 4: Get Session
**Source**: `examples/Forms_and_Surveys/Conversational Interviews with AI Agents and n8n Forms.json`  
**Workflow**: Conversational Interviews with AI Agents and n8n Forms

**Credentials**: `{{CREDENTIAL_redis}}`

**Configuration**:
```json
{
  "key": "=session_{{ $('UUID').first().json.data }}",
  "keyType": "list",
  "options": {},
  "operation": "get",
  "propertyName": "session"
}
```

##### Example 5: Update Session1
**Source**: `examples/Forms_and_Surveys/Conversational Interviews with AI Agents and n8n Forms.json`  
**Workflow**: Conversational Interviews with AI Agents and n8n Forms

**Credentials**: `{{CREDENTIAL_redis}}`

**Configuration**:
```json
{
  "list": "=session_{{ $('UUID').first().json.data }}",
  "tail": true,
  "operation": "push",
  "messageData": "={{ $json.toJsonString() }}"
}
```


---

### Supabase
**Type**: `n8n-nodes-base.supabase`  
**Description**: CRUD operations on Supabase PostgreSQL tables.  
**Auth Required**: `supabaseApi`  
**Usage Count**: 12 templates

#### Common Operations/Modes
- `delete`
- `getAll`

#### Usage Examples

##### Example 1: Get companies
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Autonomous AI crawler.json`  
**Workflow**: Autonomous AI crawler

**Credentials**: `{{CREDENTIAL_supabaseApi}}`

**Configuration**:
```json
{
  "tableId": "companies_input",
  "operation": "getAll"
}
```

##### Example 2: Insert new row
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Autonomous AI crawler.json`  
**Workflow**: Autonomous AI crawler

**Credentials**: `{{CREDENTIAL_supabaseApi}}`

**Configuration**:
```json
{
  "tableId": "companies_output",
  "dataToSend": "autoMapInputData"
}
```

##### Example 3: Retrieve Rows from Table
**Source**: `examples/Database_and_Storage/Supabase Insertion & Upsertion & Retrieval.json`  
**Workflow**: Supabase Insertion & Upsertion & Retrieval

**Configuration**:
```json
{
  "tableId": "n8n",
  "operation": "getAll",
  "returnAll": true
}
```

##### Example 4: Delete old embeddings if exist
**Source**: `examples/Notion/Upsert huge documents in a vector store with Supabase and Notion.json`  
**Workflow**: RAG on living data

**Credentials**: `{{CREDENTIAL_supabaseApi}}`

**Configuration**:
```json
{
  "tableId": "documents",
  "operation": "delete",
  "filterType": "string",
  "filterString": "=metadata->>id=eq.{{ $('Input Reference').item.json.id }}"
}
```

##### Example 5: Create File record2
**Source**: `examples/OpenAI_and_LLMs/AI Agent To Chat With Files In Supabase Storage.json`  
**Workflow**: AI Agent To Chat With Files In Supabase Storage

**Credentials**: `{{CREDENTIAL_supabaseApi}}`

**Configuration**:
```json
{
  "tableId": "files",
  "fieldsUi": {
    "fieldValues": [
      {
        "fieldId": "name",
        "fieldValue": "={{ $('Loop Over Items').item.json.name }}"
      },
      {
        "fieldId": "storage_id",
        "fieldValue": "={{ $('Loop Over Items').item.json.id }}"
      }
    ]
  }
}
```


---

### Elasticsearch
**Type**: `n8n-nodes-base.elasticsearch`  
**Description**: n8n node for elasticsearch operations.  
**Auth Required**: `elasticsearchApi`  
**Usage Count**: 1 templates

#### Common Operations/Modes
- `create`

#### Usage Examples

##### Example 1: Create Docs In Elasticsearch
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build Your Own Image Search Using AI Object Detection, CDN and ElasticSearchBuild Your Own Image Search Using AI Object Detection, CDN and ElasticSearch.json`  
**Workflow**: Build Your Own Image Search Using AI Object Detection, CDN and ElasticSearchBuild Your Own Image Search Using AI Object Detection, CDN and ElasticSearch

**Credentials**: `{{CREDENTIAL_elasticsearchApi}}`

**Configuration**:
```json
{
  "indexId": "={{ $('Set Variables').item.json.elasticsearch_index }}",
  "options": {},
  "fieldsUi": {
    "fieldValues": [
      {
        "fieldId": "image_url",
        "fieldValue": "={{ $json.secure_url.replace('upload','upload/f_auto,q_auto') }}"
      },
      {
        "fieldId": "source_image_url",
        "fieldValue": "={{ $('Set Variables').item.json.source_image }}"
      },
      {
        "fieldId": "label",
        "fieldValue": "={{ $('Crop Object From Image').item.json.label }}"
      },
      {
        "fieldId": "metadata",
        "fieldValue": "={{ JSON.stringify(Object.assign($('Crop Object From Image').item.json, { filename: $json.original_filename })) }}"
      }
    ]
  },
  "operation": "create",
  "additionalFields": {}
}
```


---

### Baserow
**Type**: `n8n-nodes-base.baserow`  
**Description**: n8n node for baserow operations.  
**Auth Required**: `baserowApi`  
**Usage Count**: 4 templates

#### Common Operations/Modes
- `create`

#### Usage Examples

##### Example 1: Save A.I. output to Baserow
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Send Google analytics data to A.I. to analyze then save results in Baserow.json`  
**Workflow**: Google analytics template

**Configuration**:
```json
{
  "tableId": 601,
  "fieldsUi": {
    "fieldValues": [
      {
        "fieldId": 5833,
        "fieldValue": "Name of your blog"
      },
      {
        "fieldId": 5831,
        "fieldValue": "={{ $('Send page data to A.I.').item.json.choices[0].message.content }}"
      },
      {
        "fieldId": 5830,
        "fieldValue": "={{ $('Send page Search data to A.I.').item.json.choices[0].message.content }}"
      },
      {
        "fieldId": 5832,
        "fieldValue": "={{ $json.choices[0].message.content }}"
      },
      {
        "fieldId": 5829,
        "fieldValue": "={{ DateTime.now() }}"
      }
    ]
  },
  "operation": "create",
  "databaseId": 121
}
```

##### Example 2: Save A.I. output to Baserow
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Send Google analytics data to A.I. to analyze then save results in BaserowSend Google analytics data to A.I. to analyze then save results in Baserow.json`  
**Workflow**: Google analytics template

**Configuration**:
```json
{
  "tableId": 601,
  "fieldsUi": {
    "fieldValues": [
      {
        "fieldId": 5833,
        "fieldValue": "Name of your blog"
      },
      {
        "fieldId": 5831,
        "fieldValue": "={{ $('Send page data to A.I.').item.json.choices[0].message.content }}"
      },
      {
        "fieldId": 5830,
        "fieldValue": "={{ $('Send page Search data to A.I.').item.json.choices[0].message.content }}"
      },
      {
        "fieldId": 5832,
        "fieldValue": "={{ $json.choices[0].message.content }}"
      },
      {
        "fieldId": 5829,
        "fieldValue": "={{ DateTime.now() }}"
      }
    ]
  },
  "operation": "create",
  "databaseId": 121
}
```

##### Example 3: Save data to Baserow
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Summarize SERPBear data with AI (via Openrouter) and save it to Baserow.json`  
**Workflow**: SERPBear analytics template

**Credentials**: `{{CREDENTIAL_baserowApi}}`

**Configuration**:
```json
{
  "tableId": 644,
  "fieldsUi": {
    "fieldValues": [
      {
        "fieldId": 6264,
        "fieldValue": "={{ DateTime.now().toFormat('yyyy-MM-dd') }}"
      },
      {
        "fieldId": 6265,
        "fieldValue": "={{ $json.choices[0].message.content }}"
      },
      {
        "fieldId": 6266,
        "fieldValue": "Rumjahn"
      }
    ]
  },
  "operation": "create",
  "databaseId": 121
}
```

##### Example 4: Save data to Baserow
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Summarize Umami data with AI (via Openrouter) and save it to Baserow.json`  
**Workflow**: Umami analytics template

**Credentials**: `{{CREDENTIAL_baserowApi}}`

**Configuration**:
```json
{
  "tableId": 607,
  "fieldsUi": {
    "fieldValues": [
      {
        "fieldId": 5870,
        "fieldValue": "={{ $json.choices[0].message.content }}"
      },
      {
        "fieldId": 5869,
        "fieldValue": "={{ $('Send data to A.I.').first().json.choices[0].message.content }}"
      },
      {
        "fieldId": 5868,
        "fieldValue": "={{ DateTime.now().toFormat('yyyy-MM-dd') }}"
      },
      {
        "fieldId": 5871,
        "fieldValue": "Name of your blog"
      }
    ]
  },
  "operation": "create",
  "databaseId": 121
}
```


---

### BaserowTool
**Type**: `n8n-nodes-base.baserowTool`  
**Description**: n8n node for baserowTool operations.  
**Auth Required**: `baserowApi`  
**Usage Count**: 2 templates

#### Usage Examples

##### Example 1: Tasks
**Source**: `examples/Telegram/Angie, Personal AI Assistant with Telegram Voice and Text.json`  
**Workflow**: Angie, Personal AI Assistant with Telegram Voice and Text

**Credentials**: `{{CREDENTIAL_baserowApi}}`

**Configuration**:
```json
{
  "tableId": 372174,
  "databaseId": 146496,
  "additionalOptions": {}
}
```

##### Example 2: Contacts
**Source**: `examples/Telegram/Angie, Personal AI Assistant with Telegram Voice and Text.json`  
**Workflow**: Angie, Personal AI Assistant with Telegram Voice and Text

**Credentials**: `{{CREDENTIAL_baserowApi}}`

**Configuration**:
```json
{
  "tableId": 372177,
  "databaseId": 146496,
  "descriptionType": "manual",
  "toolDescription": "Useful for getting contact information. For example emails or phone numbers.",
  "additionalOptions": {}
}
```


---

### NocoDb
**Type**: `n8n-nodes-base.nocoDb`  
**Description**: n8n node for nocoDb operations.  
**Auth Required**: `nocoDbApiToken`  
**Usage Count**: 1 templates

#### Common Operations/Modes
- `create`

#### Usage Examples

##### Example 1: NocoDB news database
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Scrape and summarize posts of a news site without RSS feed using AI and save them to a NocoDB.json`  
**Workflow**: News Extraction

**Credentials**: `{{CREDENTIAL_nocoDbApiToken}}`

**Configuration**:
```json
{
  "table": "mhbalmu9aaqcun6",
  "fieldsUi": {
    "fieldValues": [
      {
        "fieldName": "=News_Source",
        "fieldValue": "=Colt"
      },
      {
        "fieldName": "Title",
        "fieldValue": "={{ $json[\"title\"] }}"
      },
      {
        "fieldName": "Date",
        "fieldValue": "={{ $json[\"Date\"] }}"
      },
      {
        "fieldName": "Link",
        "fieldValue": "={{ $json[\"Link\"] }}"
      },
      {
        "fieldName": "Summary",
        "fieldValue": "={{ $json[\"summary\"] }}"
      },
      {
        "fieldName": "Keywords",
        "fieldValue": "={{ $json[\"keywords\"] }}"
      }
    ]
  },
  "operation": "create",
  "projectId": "prqu4e8bjj4bv1j",
  "authentication": "nocoDbApiToken"
}
```

