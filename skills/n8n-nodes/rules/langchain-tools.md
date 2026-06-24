---
tags: [n8n, langchain, tools, agent-tools, serpapi, wikipedia, http, workflow-tool]
category: langchain-tools
description: Tool nodes that extend AI agent capabilities — web search, HTTP calls, sub-workflows, code execution
---

# LangChain Agent Tools

## Overview
Tool nodes that extend AI agent capabilities — web search, HTTP calls, sub-workflows, code execution.

## Nodes in This Category

---

### ToolCalculator
**Type**: `@n8n/n8n-nodes-langchain.toolCalculator`  
**Description**: Provides basic arithmetic calculation capability to an AI agent.  
**Auth Required**: `none`  
**Usage Count**: 7 templates

#### Usage Examples

##### Example 1: Calculator
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Create a Google Analytics Data Report with AI and sent it to E-Mail and Telegram.json`  
**Workflow**: Google Analytics: Weekly Report

##### Example 2: Calculator
**Source**: `examples/Google_Drive_and_Google_Sheets/Summarize the New Documents from Google Drive and Save Summary in Google Sheet.json`  
**Workflow**: Google Doc Summarizer to Google Sheets

##### Example 3: Calculator
**Source**: `examples/Notion/Turn Emails into AI-Enhanced Tasks in Notion (Multi-User Support) with Gmail, Airtable and Softr.json`  
**Workflow**: mails2notion V2

##### Example 4: Calculator1
**Source**: `examples/Notion/Turn Emails into AI-Enhanced Tasks in Notion (Multi-User Support) with Gmail, Airtable and Softr.json`  
**Workflow**: mails2notion V2

##### Example 5: Calculator
**Source**: `examples/OpenAI_and_LLMs/Chat with OpenAI Assistant (by adding a memory).json`  
**Workflow**: Chat with OpenAI Assistant (by adding a memory)


---

### ToolCode
**Type**: `@n8n/n8n-nodes-langchain.toolCode`  
**Description**: Executes custom JavaScript or Python code as an agent tool.  
**Auth Required**: `none`  
**Usage Count**: 5 templates

#### Usage Examples

##### Example 1: Get Tenant Details
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Reconcile Rent Payments with Local Excel Spreadsheet and OpenAI.json`  
**Workflow**: Reconcile Rent Payments with Local Excel Spreadsheet and OpenAI

**Configuration**:
```json
{
  "name": "get_tenant_details",
  "jsCode": "const xlsx = require('xlsx');\n\nconst { spreadsheet_location } = $('Set Variables').item.json;\nconst sheetName = 'tenants';\n\nconst wb = xlsx.readFile(spreadsheet_location, { sheets: [sheetName] });\ncon...",
  "description": "Call this tool to get a tenant's details which includes their tenancy terms, rent amount and any notes attached to their account. Pass in one or an array of either the tenant ID or the name of the tenant."
}
```

**Code**:
```python
const xlsx = require('xlsx');

const { spreadsheet_location } = $('Set Variables').item.json;
const sheetName = 'tenants';

const wb = xlsx.readFile(spreadsheet_location, { sheets: [sheetName] });
const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { raw: false });

const queryToList = [].concat(typeof query === 'string' ? query.split(',') : query);

const result = queryToList.map(q => (
 rows.find(row =>
 row['Tenant Name'].toLowerCase() === q.toLowerCase()
 || row['Tenant ID'].toLowerCase() === q.toString().toLowerCase()
 )
));

return result ? JSON.stringify(result) : `No results were found for ${query}`;
```

##### Example 2: Get Property Details
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Reconcile Rent Payments with Local Excel Spreadsheet and OpenAI.json`  
**Workflow**: Reconcile Rent Payments with Local Excel Spreadsheet and OpenAI

**Configuration**:
```json
{
  "name": "get_property_details",
  "jsCode": "const xlsx = require('xlsx');\n\nconst { spreadsheet_location } = $('Set Variables').item.json;\nconst sheetName = 'properties'\n\nconst wb = xlsx.readFile(spreadsheet_location, { sheets: [sheetName] });\nc...",
  "description": "Call this tool to get a property details which includes the address, postcode and type of the property. Pass in one or an array of Property IDs."
}
```

**Code**:
```python
const xlsx = require('xlsx');

const { spreadsheet_location } = $('Set Variables').item.json;
const sheetName = 'properties'

const wb = xlsx.readFile(spreadsheet_location, { sheets: [sheetName] });
const rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { raw: false });

const queryToList = [].concat(typeof query === 'string' ? query.split(',') :query);

const result = queryToList.map(q => rows.find(row => row['Property ID'] === q));

return result ? JSON.stringify(result) : `No results were found for ${query}`;
```

##### Example 3: Create map image
**Source**: `examples/Airtable/AI Agent to chat with Airtable and analyze data.json`  
**Workflow**: AI Agent to chat with Airtable and analyze data

**Configuration**:
```json
{
  "name": "create_map",
  "jsCode": "// Example: convert the incoming query to uppercase and return it\n\nreturn `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${query.markers}/-96.9749,41.8219,3.31,0/800x500?before_layer=admi...",
  "schemaType": "manual",
  "description": "Create link with image for map graph.\nUse addresses' longitude and latitude to create input data.\n\nInput Example:\npin-s+555555(-74.006,40.7128),pin-s+555555(-118.2437,34.0522)\n\nOutput Example:\nImage link.",
  "inputSchema": "{\n\"type\": \"object\",\n\"properties\": {\n\t\"markers\": {\n\t\t\"type\": \"string\",\n\t\t\"description\": \"List of markers with longitude and latitude data separated by comma. Keep the same color 555555|Example: pin-s+555555(-74.006,40.7128),pin-s+555555(-118.2437,34.0522)\"\n\t\t}\n\t}\n}",
  "specifyInputSchema": true
}
```

**Code**:
```python
// Example: convert the incoming query to uppercase and return it

return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${query.markers}/-96.9749,41.8219,3.31,0/800x500?before_layer=admin-0-boundary&access_token=<your_public_key>`;
```

##### Example 4: Tool: Get current date and time
**Source**: `examples/OpenAI_and_LLMs/OpenAI assistant with custom tools.json`  
**Workflow**: OpenAI Assistant with custom n8n tools

**Configuration**:
```json
{
  "name": "date_tool",
  "jsCode": "let now = DateTime.now()\nreturn now.toISO()",
  "description": "Call this tool to get the current timestamp (in ISO format). No parameters necessary"
}
```

**Code**:
```python
let now = DateTime.now()
return now.toISO()
```

##### Example 5: Query Workflow Credentials Database
**Source**: `examples/OpenAI_and_LLMs/Query n8n Credentials with AI SQL Agent.json`  
**Workflow**: Query n8n Credentials with AI SQL Agent

**Configuration**:
```json
{
  "name": "query_workflow_credentials_database",
  "language": "python",
  "pythonCode": "import json\nimport sqlite3\ncon = sqlite3.connect(\"n8n_workflow_credentials.db\")\n\ncur = con.cursor()\nres = cur.execute(query);\n\noutput = json.dumps(res.fetchall())\n\ncon.close()\nreturn output;",
  "description": "Call this tool to query the workflow credentials database. The database is already set. The available tables are as follows:\n* n8n_workflow_credentials (workflow_id TEXT PRIMARY KEY, workflow_name TEXT, credentials TEXT);\n * n8n_workflow_credentials.credentials are stored as json string and the app name may be obscured. Prefer querying using the %LIKE% operation for best results.\n\nPass a SQL SELECT query to this tool for the available tables."
}
```

**Code**:
```python
import json
import sqlite3
con = sqlite3.connect("n8n_workflow_credentials.db")

cur = con.cursor()
res = cur.execute(query);

output = json.dumps(res.fetchall())

con.close()
return output;
```


---

### ToolHttpRequest
**Type**: `@n8n/n8n-nodes-langchain.toolHttpRequest`  
**Description**: Makes HTTP API calls as an agent tool. Supports all HTTP methods and auth types.  
**Auth Required**: `calApi`, `httpHeaderAuth`, `microsoftOutlookOAuth2Api`, `notionApi`, `openAiApi`  
**Usage Count**: 23 templates

#### Usage Examples

##### Example 1: HTTP Request1
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Hacker News to Video Content.json`  
**Workflow**: Hacker News to Video Template - AlexK1919

**Configuration**:
```json
{
  "url": "={{ $json.url }}",
  "toolDescription": "grab the article for the ai agent to use"
}
```

##### Example 2: Search notion database
**Source**: `examples/Notion/Notion knowledge base AI assistant.json`  
**Workflow**: Notion knowledge base AI assistant

**Credentials**: `{{CREDENTIAL_notionApi}}`

**Configuration**:
```json
{
  "url": "=https://api.notion.com/v1/databases/{{ $json.notionID }}/query",
  "method": "POST",
  "jsonBody": "{\n \"filter\": {\n \"or\": [\n {\n \"property\": \"question\",\n \"rich_text\": {\n \"contains\": \"{keyword}\"\n }\n },\n {\n \"property\": \"tags\",\n \"multi_select\": {\n \"contains\": \"{tag}\"\n }\n }\n ]\n },\n \"sorts\": [\n {\n \"property\": \"updated_at\",\n \"direction\": \"ascending\"\n }\n ]\n}",
  "sendBody": true,
  "specifyBody": "json",
  "authentication": "predefinedCredentialType",
  "toolDescription": "=Use this tool to search the \"\" Notion app database.\n\nIt is structured with question and answer format. \nYou can filter query result by:\n- By keyword\n- filter by tag.\n\nKeyword and Tag have an OR relationship not AND.\n\n",
  "nodeCredentialType": "notionApi",
  "placeholderDefinitions": {
    "values": [
      {
        "name": "keyword",
        "description": "Searches question of the record. Use one keyword at a time."
      },
      {
        "name": "tag",
        "description": "=Options: {{ $json.tagsOptions }}"
      }
    ]
  }
}
```

##### Example 3: Search inside database record
**Source**: `examples/Notion/Notion knowledge base AI assistant.json`  
**Workflow**: Notion knowledge base AI assistant

**Credentials**: `{{CREDENTIAL_notionApi}}`

**Configuration**:
```json
{
  "url": "https://api.notion.com/v1/blocks/{page_id}/children",
  "fields": "id, type, paragraph.text, heading_1.text, heading_2.text, heading_3.text, bulleted_list_item.text, numbered_list_item.text, to_do.text, children",
  "dataField": "results",
  "authentication": "predefinedCredentialType",
  "fieldsToInclude": "selected",
  "toolDescription": "=Use this tool to retrieve Notion page content using the page ID. \n\nIt is structured with question and answer format. \nYou can filter query result by:\n- By keyword\n- filter by tag.\n\nKeyword and Tag have an OR relationship not AND.\n\n",
  "optimizeResponse": true,
  "nodeCredentialType": "notionApi",
  "placeholderDefinitions": {
    "values": [
      {
        "name": "page_id",
        "description": "Notion page id from 'Search notion database' tool results"
      }
    ]
  }
}
```

##### Example 4: Weather HTTP Request
**Source**: `examples/OpenAI_and_LLMs/AI Agent with Ollama for current weather and wiki.json`  
**Workflow**: AI Agent with Ollama for current weather and wiki

**Configuration**:
```json
{
  "url": "https://api.open-meteo.com/v1/forecast",
  "sendQuery": true,
  "parametersQuery": {
    "values": [
      {
        "name": "latitude"
      },
      {
        "name": "longitude"
      },
      {
        "name": "forecast_days",
        "value": "1",
        "valueProvider": "fieldValue"
      },
      {
        "name": "hourly",
        "value": "temperature_2m",
        "valueProvider": "fieldValue"
      }
    ]
  },
  "toolDescription": "Fetch current temperature for given coordinates."
}
```

##### Example 5: Get calendar availability
**Source**: `examples/OpenAI_and_LLMs/Advanced AI Demo (Presented at AI Developers #14 meetup).json`  
**Workflow**: Advanced AI Demo (Presented at AI Developers #14 meetup)

**Configuration**:
```json
{
  "url": "https://www.googleapis.com/calendar/v3/freeBusy",
  "method": "POST",
  "jsonBody": "={\n \"timeMin\": \"{timeMin}\",\n \"timeMax\": \"{timeMax}\",\n \"timeZone\": \"Europe/Berlin\",\n \"groupExpansionMax\": 20,\n \"calendarExpansionMax\": 10,\n \"items\": [\n {\n \"id\": \"max@n8n.io\"\n }\n ]\n}",
  "sendBody": true,
  "specifyBody": "json",
  "authentication": "predefinedCredentialType",
  "toolDescription": "Call this tool to get the appointment availability for a particular period on the calendar. The tool may refer to availability as \"Free\" or \"Busy\". \n\nUse {timeMin} and {timeMax} to specify the window for the availability query. For example, to get availability for 25 July, 2024 the {timeMin} would be 2024-07-25T09:00:00+02:00 and {timeMax} would be 2024-07-25T17:00:00+02:00.\n\nIf the tool returns an empty response, it means that something went wrong. It does not mean that there is no availability.",
  "nodeCredentialType": "googleCalendarOAuth2Api"
}
```


---

### ToolSerpApi
**Type**: `@n8n/n8n-nodes-langchain.toolSerpApi`  
**Description**: Web search via SerpAPI as an agent tool. Returns Google search results.  
**Auth Required**: `serpApi`  
**Usage Count**: 4 templates

#### Usage Examples

##### Example 1: SerpAPI
**Source**: `examples/Instagram_Twitter_Social_Media/Automate multi-platform Social Media Content Creation with AI.json`  
**Workflow**: ✨🤖Automated AI Powered Social Media Content Factory for  X + Facebook + Instagram + LinkedIn

**Credentials**: `{{CREDENTIAL_serpApi}}`

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 2: SerpAPI
**Source**: `examples/OpenAI_and_LLMs/AI agent chat.json`  
**Workflow**: AI agent chat

**Credentials**: `{{CREDENTIAL_serpApi}}`

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 3: SerpAPI
**Source**: `examples/OpenAI_and_LLMs/AI chatbot that can search the web.json`  
**Workflow**: AI chatbot that can search the web

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 4: SerpAPI - Search Google
**Source**: `examples/OpenAI_and_LLMs/AI web researcher for sales.json`  
**Workflow**: AI web researcher for sales

**Credentials**: `{{CREDENTIAL_serpApi}}`

**Configuration**:
```json
{
  "options": {}
}
```


---

### ToolVectorStore
**Type**: `@n8n/n8n-nodes-langchain.toolVectorStore`  
**Description**: Queries a vector store as an agent tool for semantic document retrieval.  
**Auth Required**: `none`  
**Usage Count**: 9 templates

#### Usage Examples

##### Example 1: Vector Store Tool
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Chat with GitHub API Documentation_ RAG-Powered Chatbot with Pinecone & OpenAI.json`  
**Workflow**: Chat with GitHub OpenAPI Specification using RAG (Pinecone and OpenAI)

**Configuration**:
```json
{
  "name": "GitHub_OpenAPI_Specification",
  "description": "Use this tool to get information about the GitHub API. This database contains OpenAPI v3 specifications."
}
```

##### Example 2: Vector Store Tool
**Source**: `examples/HR_and_Recruitment/BambooHR AI-Powered Company Policies and Benefits Chatbot.json`  
**Workflow**: BambooHR AI-Powered Company Policies and Benefits Chatbot

**Configuration**:
```json
{
  "name": "company_files",
  "topK": 5,
  "description": "Retrieves information from the company handbook, 401k policies, benefits overview, and expense policies available to all employees."
}
```

##### Example 3: Vector Store Tool
**Source**: `examples/Google_Drive_and_Google_Sheets/RAG Chatbot for Company Documents using Google Drive and Gemini.json`  
**Workflow**: RAG Workflow For Company Documents stored in Google Drive

**Configuration**:
```json
{
  "name": "company_documents_tool",
  "description": "Retrieve information from any company documents"
}
```

##### Example 4: Answer questions with a vector store
**Source**: `examples/HR_and_Recruitment/HR & IT Helpdesk Chatbot with Audio Transcription.json`  
**Workflow**: HR & IT Helpdesk Chatbot with Audio Transcription

**Configuration**:
```json
{
  "name": "hr_employee_policies",
  "description": "data for HR and employee policies"
}
```

##### Example 5: Vector Store Tool1
**Source**: `examples/OpenAI_and_LLMs/AI Agent To Chat With Files In Supabase Storage.json`  
**Workflow**: AI Agent To Chat With Files In Supabase Storage

**Configuration**:
```json
{
  "name": "knowledge_base",
  "topK": 8,
  "description": "Retrieve data about user request"
}
```


---

### ToolWikipedia
**Type**: `@n8n/n8n-nodes-langchain.toolWikipedia`  
**Description**: Searches Wikipedia articles as an agent tool.  
**Auth Required**: `none`  
**Usage Count**: 11 templates

#### Usage Examples

##### Example 1: Fetch Wikipedia Information
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Open Deep Research - AI-Powered Autonomous Research Workflow.json`  
**Workflow**: Open Deep Research - AI-Powered Autonomous Research Workflow

##### Example 2: Wikipedia
**Source**: `examples/Forms_and_Surveys/Email Subscription Service with n8n Forms, Airtable and AI.json`  
**Workflow**: Email Subscription Service with n8n Forms, Airtable and AI

##### Example 3: Wikipedia
**Source**: `examples/Google_Drive_and_Google_Sheets/Summarize the New Documents from Google Drive and Save Summary in Google Sheet.json`  
**Workflow**: Google Doc Summarizer to Google Sheets

##### Example 4: Wikipedia
**Source**: `examples/OpenAI_and_LLMs/AI Agent with Ollama for current weather and wiki.json`  
**Workflow**: AI Agent with Ollama for current weather and wiki

##### Example 5: Wikipedia
**Source**: `examples/OpenAI_and_LLMs/AI chatbot that can search the web.json`  
**Workflow**: AI chatbot that can search the web


---

### ToolWorkflow
**Type**: `@n8n/n8n-nodes-langchain.toolWorkflow`  
**Description**: Wraps another n8n workflow as an agent tool. The most flexible tool type for complex operations.  
**Auth Required**: `none`  
**Usage Count**: 45 templates

#### Usage Examples

##### Example 1: Text
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Autonomous AI crawler.json`  
**Workflow**: Autonomous AI crawler

**Configuration**:
```json
{
  "name": "text_retrieval_tool",
  "source": "parameter",
  "description": "Call this tool to return all text from the given website. Query should be full website URL.",
  "workflowJson": "{\n \"nodes\": [\n {\n \"parameters\": {},\n \"id\": \"{{UUID}}\",\n \"name\": \"Execute workflow\",\n \"type\": \"n8n-nodes-base.manualTrigger\",\n \"typeVersion\": 1,\n \"position\": [\n 2220,\n 620\n ]\n },\n {\n \"parameters\": {\n \"assignments\": {\n \"assignments\": [\n {\n \"id\": \"{{UUID}}\",\n \"name\": \"domain\",\n \"value\": \"={{ $json.query }}\",\n \"type\": \"string\"\n }\n ]\n },\n \"options\": {}\n },\n \"id\": \"{{UUID}}\",\n \"name\": \"Set domain\",\n \"type\": \"n8n-nodes-base.set\",\n \"typeVersion\": 3.3,\n \"position\": [\n 2440,\n 620\n ]\n },\n {\n \"parameters\": {\n \"assignments\": {\n \"assignments\": [\n {\n \"id\": \"{{UUID}}\",\n \"name\": \"domain\",\n \"value\": \"={{ $json.domain.startsWith(\\\"http\\\") ? $json.domain : \\\"http://\\\" + $json.domain }}\",\n \"type\": \"string\"\n }\n ]\n },\n \"options\": {}\n },\n \"id\": \"{{UUID}}\",\n \"name\": \"Add protocool to domain\",\n \"type\": \"n8n-nodes-base.set\",\n \"typeVersion\": 3.3,\n \"position\": [\n 2640,\n 620\n ]\n },\n {\n \"parameters\": {\n \"assignments\": {\n \"assignments\": [\n {\n \"id\": \"{{UUID}}\",\n \"name\": \"response\",\n \"value\": \"={{ $json.data }}\",\n \"type\": \"string\"\n }\n ]\n },\n \"options\": {}\n },\n \"id\": \"{{UUID}}\",\n \"name\": \"Set response\",\n \"type\": \"n8n-nodes-base.set\",\n \"typeVersion\": 3.3,\n \"position\": [\n 3300,\n 620\n ]\n },\n {\n \"parameters\": {\n \"url\": \"={{ $json.domain }}\",\n \"options\": {}\n },\n \"id\": \"{{UUID}}\",\n \"name\": \"Get website\",\n \"type\": \"n8n-nodes-base.httpRequest\",\n \"typeVersion\": 4.2,\n \"position\": [\n 2860,\n 620\n ]\n },\n {\n \"parameters\": {\n \"html\": \"={{ $json.data }}\",\n \"options\": {\n \"ignore\": \"a,img\"\n }\n },\n \"id\": \"{{UUID}}\",\n \"name\": \"Convert HTML to 
```

##### Example 2: Ask Tool
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI.json`  
**Workflow**: Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI

**Configuration**:
```json
{
  "name": "query_tax_code_knowledgebase",
  "fields": {
    "values": [
      {
        "name": "route",
        "stringValue": "ask_tool"
      }
    ]
  },
  "workflowId": "={{ $workflow.id }}",
  "description": "Call this tool to query the tax code database for information. Structure your query in the form of a question for best results."
}
```

##### Example 3: Search Tool
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI.json`  
**Workflow**: Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI

**Configuration**:
```json
{
  "name": "get_tax_code_section",
  "fields": {
    "values": [
      {
        "name": "route",
        "stringValue": "search_tool"
      }
    ]
  },
  "workflowId": "={{ $workflow.id }}",
  "description": "Call this tool to search for specific sections of the tax code document. Pass in either a known section number/id to get the section's text or a known chapter name to return all sections for the chapter.",
  "jsonSchemaExample": "{\n\t\"chapter\": \"some_value\",\n \"section\": \"Sec 1.01\"\n}",
  "specifyInputSchema": true
}
```

##### Example 4: Call n8n Workflow Tool
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI.json`  
**Workflow**: Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI

**Configuration**:
```json
{
  "name": "movie_recommender",
  "schemaType": "manual",
  "workflowId": {
    "__rl": true,
    "mode": "id",
    "value": "a58HZKwcOy7lmz56"
  },
  "description": "Call this tool to get a list of recommended movies from a vector database. ",
  "inputSchema": "{\n\"type\": \"object\",\n\"properties\": {\n\t\"positive_example\": {\n \"type\": \"string\",\n \"description\": \"A string with a movie description matching the user's positive recommendation request\"\n },\n \"negative_example\": {\n \"type\": \"string\",\n \"description\": \"A string with a movie description matching the user's negative anti-recommendation reuqest\"\n }\n}\n}",
  "specifyInputSchema": true
}
```

##### Example 5: get_channel_details
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Extract insights & analyse YouTube comments via AI Agent chat.json`  
**Workflow**: Extract insights & analyse YouTube comments via AI Agent chat

**Configuration**:
```json
{
  "name": "get_channel_details",
  "fields": {
    "values": [
      {
        "name": "command",
        "stringValue": "=get_channel_details"
      }
    ]
  },
  "schemaType": "manual",
  "workflowId": {
    "__rl": true,
    "mode": "list",
    "value": "FgknOUpOBkpY85NX",
    "cachedResultName": "Youtube parser - tools"
  },
  "description": "Get channel_id, title and description by handle/username.\nChannel_id is required to find videos and details about this channel.\nIf Youtube link to channel provided - parse handle from there or return channel_id. (e.g. https://www.youtube.com/@example_handle - example_handle)\n\n\nExample Input:\nexample_handle\n\nExample Output:\nid:UCOgz_YflAsYnGbdvzXuKNCA\ntitle:Daniel Simmons\ndescription:Digital Diary 🤎\\n\\n\\nWeekly videos around fashion...",
  "inputSchema": "{\n \"type\": \"object\",\n \"properties\": {\n \"handle\": {\n \"type\": \"string\",\n \"description\": \"Handle/username of channel\"\n }},\n \"required\": [\"handle\"]\n}",
  "specifyInputSchema": true
}
```


---

### Code
**Type**: `@n8n/n8n-nodes-langchain.code`  
**Description**: Executes custom code (Python/JS) as a LangChain node — for custom document processing or transformations.  
**Auth Required**: `none`  
**Usage Count**: 2 templates

#### Usage Examples

##### Example 1: Custom - Wikipedia
**Source**: `examples/OpenAI_and_LLMs/Custom LangChain agent written in JavaScript.json`  
**Workflow**: LangChain - Example - Code Node Example

**Configuration**:
```json
{
  "code": {
    "supplyData": {
      "code": "console.log('Custom Wikipedia Node runs');\nconst { WikipediaQueryRun } = require('langchain/tools');\nreturn new WikipediaQueryRun();"
    }
  },
  "outputs": {
    "output": [
      {
        "type": "ai_tool"
      }
    ]
  }
}
```

##### Example 2: Custom - LLM Chain Node
**Source**: `examples/OpenAI_and_LLMs/Custom LangChain agent written in JavaScript.json`  
**Workflow**: LangChain - Example - Code Node Example

**Configuration**:
```json
{
  "code": {
    "execute": {
      "code": "const { PromptTemplate } = require('langchain/prompts');\n\nconst query = $input.item.json.input;\nconst prompt = PromptTemplate.fromTemplate(query);\nconst llm = await this.getInputConnectionData('ai_languageModel', 0);\nlet chain = prompt.pipe(llm);\nconst output = await chain.invoke();\nreturn [ {json: { output } } ];"
    }
  },
  "inputs": {
    "input": [
      {
        "type": "main"
      },
      {
        "type": "ai_languageModel",
        "required": true,
        "maxConnections": 1
      }
    ]
  },
  "outputs": {
    "output": [
      {
        "type": "main"
      }
    ]
  }
}
```

