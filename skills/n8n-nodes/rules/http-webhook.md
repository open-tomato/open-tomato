---
tags: [n8n, http, api, webhook, rest, graphql, integration]
category: http-webhook
description: Generic HTTP requests, GraphQL, and webhook endpoints for custom API integrations
---

# HTTP Requests & Webhooks

## Overview
Generic HTTP requests, GraphQL, and webhook endpoints for custom API integrations.

## Nodes in This Category

---

### HttpRequest
**Type**: `n8n-nodes-base.httpRequest`  
**Description**: Makes HTTP requests to any REST API. The most versatile integration node.  
**Auth Required**: `airtableTokenApi`, `anthropicApi`, `cloudflareApi`, `erpNextApi`, `facebookGraphApi`, `gmailOAuth2`, `googleOAuth2Api`, `googlePalmApi`, `googleSheetsOAuth2Api`, `httpBasicAuth`, `httpCustomAuth`, `httpHeaderAuth`, `httpQueryAuth`, `hubspotAppToken`, `hubspotDeveloperApi`, `hubspotOAuth2Api`, `linearOAuth2Api`, `microsoftOutlookOAuth2Api`, `mistralCloudApi`, `notionApi`, `oAuth1Api`, `oAuth2Api`, `openAiApi`, `qdrantApi`, `serpApi`, `slackApi`, `spotifyOAuth2Api`, `supabaseApi`, `virusTotalApi`, `whatsAppApi`, `wooCommerceApi`, `wordpressApi`, `youTubeOAuth2Api`, `zoomOAuth2Api`  
**Usage Count**: 404 templates

#### Usage Examples

##### Example 1: Embed image
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Automated Hugging Face Paper Summary Fetching & Categorization Workflow.json`  
**Workflow**: [3/3] Anomaly detection tool (crops dataset)

**Credentials**: `{{CREDENTIAL_httpHeaderAuth}}`

**Configuration**:
```json
{
  "url": "https://api.voyageai.com/v1/multimodalembeddings",
  "method": "POST",
  "options": {},
  "jsonBody": "={{\n{\n \"inputs\": [\n {\n \"content\": [\n {\n \"type\": \"image_url\",\n \"image_url\": $('Image URL hardcode').first().json.imageURL\n }\n ]\n }\n ],\n \"model\": \"voyage-multimodal-3\",\n \"input_type\": \"document\"\n}\n}}",
  "sendBody": true,
  "specifyBody": "json",
  "authentication": "genericCredentialType",
  "genericAuthType": "httpHeaderAuth"
}
```

##### Example 2: Get similarity of medoids
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Automated Hugging Face Paper Summary Fetching & Categorization Workflow.json`  
**Workflow**: [3/3] Anomaly detection tool (crops dataset)

**Credentials**: `{{CREDENTIAL_qdrantApi}}`

**Configuration**:
```json
{
  "url": "={{ $('Variables for medoids').first().json.qdrantCloudURL }}/collections/{{ $('Variables for medoids').first().json.collectionName }}/points/query",
  "method": "POST",
  "options": {},
  "jsonBody": "={{\n{\n \"query\": $json.data[0].embedding,\n \"using\": \"voyage\",\n \"limit\": $('Info About Crop Labeled Clusters').first().json.cropsNumber,\n \"with_payload\": true,\n \"filter\": {\n \"must\": [\n { \n \"key\": $('Variables for medoids').first().json.clusterCenterType,\n \"match\": {\n \"value\": true\n }\n }\n ]\n }\n}\n}}",
  "sendBody": true,
  "specifyBody": "json",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "qdrantApi"
}
```

##### Example 3: Get website (text)
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Autonomous AI crawler.json`  
**Workflow**: Autonomous AI crawler

**Configuration**:
```json
{
  "url": "={{ $json.domain }}",
  "options": {}
}
```

##### Example 4: Use Detr-Resnet-50 Object Classification
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build Your Own Image Search Using AI Object Detection, CDN and ElasticSearchBuild Your Own Image Search Using AI Object Detection, CDN and ElasticSearch.json`  
**Workflow**: Build Your Own Image Search Using AI Object Detection, CDN and ElasticSearchBuild Your Own Image Search Using AI Object Detection, CDN and ElasticSearch

**Credentials**: `{{CREDENTIAL_cloudflareApi}}`

**Configuration**:
```json
{
  "url": "=https://api.cloudflare.com/client/v4/accounts/{{ $('Set Variables').item.json.CLOUDFLARE_ACCOUNT_ID }}/ai/run/{{ $('Set Variables').item.json.model }}",
  "method": "POST",
  "options": {},
  "sendBody": true,
  "contentType": "binaryData",
  "authentication": "predefinedCredentialType",
  "inputDataFieldName": "data",
  "nodeCredentialType": "cloudflareApi"
}
```

##### Example 5: Upload to Cloudinary
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build Your Own Image Search Using AI Object Detection, CDN and ElasticSearchBuild Your Own Image Search Using AI Object Detection, CDN and ElasticSearch.json`  
**Workflow**: Build Your Own Image Search Using AI Object Detection, CDN and ElasticSearchBuild Your Own Image Search Using AI Object Detection, CDN and ElasticSearch

**Credentials**: `{{CREDENTIAL_httpQueryAuth}}`

**Configuration**:
```json
{
  "url": "https://api.cloudinary.com/v1_1/daglih2g8/image/upload",
  "method": "POST",
  "options": {},
  "sendBody": true,
  "sendQuery": true,
  "contentType": "multipart-form-data",
  "authentication": "genericCredentialType",
  "bodyParameters": {
    "parameters": [
      {
        "name": "file",
        "parameterType": "formBinaryData",
        "inputDataFieldName": "data"
      }
    ]
  },
  "genericAuthType": "httpQueryAuth",
  "queryParameters": {
    "parameters": [
      {
        "name": "upload_preset",
        "value": "n8n-workflows-preset"
      }
    ]
  }
}
```


---

### Graphql
**Type**: `n8n-nodes-base.graphql`  
**Description**: Executes GraphQL queries and mutations.  
**Auth Required**: `httpHeaderAuth`  
**Usage Count**: 6 templates

#### Usage Examples

##### Example 1: Fetch Linear team details
**Source**: `examples/Linear/Create Linear tickets from Notion content.json`  
**Workflow**: Create Linear tickets from Notion content

**Credentials**: `{{CREDENTIAL_httpHeaderAuth}}`

**Configuration**:
```json
{
  "query": "=query GetTeamsAndProjects {\n  teams(filter: {name: {contains: \"{{ $json['Linear team name'] }}\"}}) {\n    nodes {\n      id\n      name\n      members {\n        nodes {\n          id\n          name\n          email\n        }\n      }\n      projects {\n        nodes {\n          id\n          name\n          description\n        }\n      }\n    }\n  }\n}\n",
  "endpoint": "https://api.linear.app/graphql",
  "requestMethod": "GET",
  "authentication": "headerAuth"
}
```

##### Example 2: Fetch Active Linear Issues
**Source**: `examples/Linear/Sentiment analysis tracking on support issues with Linear and Slack.json`  
**Workflow**: Sentiment analysis tracking on support issues with Linear and Slack

**Credentials**: `{{CREDENTIAL_httpHeaderAuth}}`

**Configuration**:
```json
{
  "query": "=query (\n  $filter: IssueFilter\n) {\n  issues(\n    filter: $filter\n  ) {\n    nodes {\n      id\n      identifier\n      title\n      description\n      url\n      createdAt\n      updatedAt\n      assignee {\n        name\n      }\n      comments {\n        nodes {\n          id\n          createdAt\n          user {\n            displayName\n          }\n          body\n        }\n      }\n    }\n  }\n}",
  "endpoint": "https://api.linear.app/graphql",
  "variables": "={{\n{\n  \"filter\": {\n    updatedAt: { gte: $now.minus(30, 'minutes').toISO() }\n  }\n}\n}}",
  "requestFormat": "json",
  "authentication": "headerAuth"
}
```

##### Example 3: Get issue URL
**Source**: `examples/Linear/Create Linear tickets from Notion content.json`  
**Workflow**: Create Linear tickets from Notion content

**Credentials**: `{{CREDENTIAL_httpHeaderAuth}}`

**Configuration**:
```json
{
  "query": "=query IssueDetails {\n  issue(id: \"{{ $json.id }}\") {\n    url\n  }\n}",
  "endpoint": "https://api.linear.app/graphql",
  "requestMethod": "GET",
  "authentication": "headerAuth"
}
```

##### Example 4: Get all your team's tickets
**Source**: `examples/Linear/Write all Linear tickets to Google Sheets.json`  
**Workflow**: Write all Linear tickets to Google Sheets

**Credentials**: `{{CREDENTIAL_httpHeaderAuth}}`

**Configuration**:
```json
{
  "query": "query ($filter: IssueFilter) {\n  issues(filter: $filter, first: 100) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    nodes {\n      id\n      identifier\n      url\n      title\n      priorityLabel\n      createdAt\n      completedAt\n      state {\n        type\n        name\n      }\n      cycle {\n        number\n      }\n      estimate\n      labels { nodes { name } }\n    }\n  }\n}",
  "endpoint": "https://api.linear.app/graphql",
  "variables": "={\n  \"filter\": {\n    \"team\": {\n      \"name\":  {\n        \"eq\": \"Adore\"\n      }\n    }\n  }\n}",
  "requestFormat": "json",
  "authentication": "headerAuth"
}
```

##### Example 5: Get next page
**Source**: `examples/Linear/Write all Linear tickets to Google Sheets.json`  
**Workflow**: Write all Linear tickets to Google Sheets

**Credentials**: `{{CREDENTIAL_httpHeaderAuth}}`

**Configuration**:
```json
{
  "query": "=query ($filter: IssueFilter) {\n  issues(filter: $filter, first: 100, after: \"{{ $json.after }}\") {\n    nodes {\n      id\n      identifier\n      url\n      title\n      priorityLabel\n      createdAt\n      completedAt\n      state {\n        type\n        name\n      }\n      cycle {\n        number\n      }\n      estimate\n      labels { nodes { name } }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n}",
  "endpoint": "https://api.linear.app/graphql",
  "variables": "={\n  \"filter\": {\n    \"team\": {\n      \"name\":  {\n        \"eq\": \"Adore\"\n      }\n    }\n  }\n}",
  "requestFormat": "json",
  "authentication": "headerAuth"
}
```


---

### RssFeedRead
**Type**: `n8n-nodes-base.rssFeedRead`  
**Description**: n8n node for rssFeedRead operations.  
**Auth Required**: `none`  
**Usage Count**: 1 templates

#### Usage Examples

##### Example 1: RSS Read
**Source**: `examples/Slack/AI-Powered Information Monitoring with OpenAI, Google Sheets, Jina AI and Slack.json`  
**Workflow**: AI-Powered Information Monitoring with OpenAI, Google Sheets, Jina AI and Slack

**Configuration**:
```json
{
  "url": "={{ $json.rss_feed_url }}",
  "options": {
    "ignoreSSL": false
  }
}
```


---

### Webhook
**Type**: `n8n-nodes-base.webhook`  
**Description**: Exposes an HTTP endpoint that triggers the workflow on incoming requests. Supports GET, POST, PATCH, DELETE.  
**Auth Required**: `httpBasicAuth`, `httpHeaderAuth`  
**Usage Count**: 55 templates

#### Usage Examples

##### Example 1: Webhook
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Analyze tradingview.com charts with Chrome extension, N8N and OpenAI.json`  
**Workflow**: chrome extension backend with AI

**Configuration**:
```json
{
  "path": "{{UUID}}",
  "options": {},
  "httpMethod": "POST",
  "responseMode": "responseNode"
}
```

##### Example 2: Webhook
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Intelligent Web Query and Semantic Re-Ranking Flow using Brave and Google Gemini.json`  
**Workflow**: Intelligent Web Query and Semantic Re-Ranking Flow

**Configuration**:
```json
{
  "path": "{{UUID}}",
  "options": {},
  "responseMode": "responseNode"
}
```

##### Example 3: Webhook
**Source**: `examples/Airtable/AI Agent for project management and meetings with Airtable and Fireflies.json`  
**Workflow**: AI Agent for project management and meetings with Airtable and Fireflies

**Configuration**:
```json
{
  "path": "{{UUID}}",
  "options": {},
  "httpMethod": "POST"
}
```

##### Example 4: 🎣 Linear Issue Updated Webhook
**Source**: `examples/Linear/Bidirectional ticket sync between Freshdesk and Linear with error logging.json`  
**Workflow**: Freshdesk-YOUR_OPENAI_KEY_HERE Bridge

**Configuration**:
```json
{
  "path": "linear-issue-updated",
  "options": {}
}
```

##### Example 5: Webhook - ChatInput
**Source**: `examples/OpenAI_and_LLMs/AI Agent to chat with you Search Console Data, using OpenAI and Postgres.json`  
**Workflow**: AI Agent to chat with you Search Console Data, using OpenAI and Postgres

**Credentials**: `{{CREDENTIAL_httpBasicAuth}}`

**Configuration**:
```json
{
  "path": "{{UUID}}/chat",
  "options": {},
  "httpMethod": "POST",
  "responseMode": "responseNode",
  "authentication": "basicAuth"
}
```


---

### RespondToWebhook
**Type**: `n8n-nodes-base.respondToWebhook`  
**Description**: Sends an HTTP response back to the caller of a webhook trigger.  
**Auth Required**: `none`  
**Usage Count**: 60 templates

#### Usage Examples

##### Example 1: Respond to Webhook
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Analyze tradingview.com charts with Chrome extension, N8N and OpenAI.json`  
**Workflow**: chrome extension backend with AI

**Configuration**:
```json
{
  "options": {},
  "respondWith": "text",
  "responseBody": "={{ $json.content }}"
}
```

##### Example 2: Success with cookie
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Ultimate Scraper Workflow for n8n.json`  
**Workflow**: Selenium Ultimate Scraper Workflow

**Configuration**:
```json
{
  "options": {
    "responseCode": 200
  }
}
```

##### Example 3: Respond to Webhook
**Source**: `examples/OpenAI_and_LLMs/AI Voice Chat using Webhook, Memory Manager, OpenAI, Google Gemini & ElevenLabs.json`  
**Workflow**: AI Voice Chat using Webhook, Memory Manager, OpenAI, Google Gemini & ElevenLabs

**Configuration**:
```json
{
  "options": {},
  "respondWith": "binary"
}
```

##### Example 4: Show the image to user
**Source**: `examples/OpenAI_and_LLMs/🎨 Interactive Image Editor with FLUX.1 Fill Tool for Inpainting.json`  
**Workflow**: FLUX-fill standalone

**Configuration**:
```json
{
  "options": {
    "responseHeaders": {
      "entries": [
        {
          "name": "Content-Type",
          "value": "={{ $binary.data.mimeType }}"
        }
      ]
    }
  },
  "respondWith": "binary",
  "responseDataSource": "set"
}
```

##### Example 5: Respond to Webhook
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Intelligent Web Query and Semantic Re-Ranking Flow using Brave and Google Gemini.json`  
**Workflow**: Intelligent Web Query and Semantic Re-Ranking Flow

**Configuration**:
```json
{
  "options": {},
  "respondWith": "text",
  "responseBody": "={\n \"Highest_RANKEDURL_1\": {\n \"title\": \"{{ $item('0').$node['Semantic Search - Result Re-Ranker'].json['output']['Highest_RANKEDURL_1']['title'] }}\",\n \"link\": \"{{ $item('0').$node['Semantic Search - Result Re-Ranker'].json['output']['Highest_RANKEDURL_1']['link'] }}\",\n \"description\": \"{{ $item('0').$node['Semantic Search - Result Re-Ranker'].json['output']['Highest_RANKEDURL_1']['description'] }}\"\n },\n \"Highest_RANKEDURL_2\": {\n \"title\": \"{{ $item('0').$node['Semantic Search - Result Re-Ranker'].json['output']['Highest_RANKEDURL_2']['title'] }}\",\n \"link\": \"{{ $item('0').$node['Semantic Search - Result Re-Ranker'].json['output']['Highest_RANKEDURL_2']['link'] }}\",\n \"description\": \"{{ $item('0').$node['Semantic Search - Result Re-Ranker'].json['output']['Highest_RANKEDURL_2']['description'] }}\"\n },\n \"Highest_RANKEDURL_3\": {\n \"title\": \"{{ $item('0').$node['Semantic Search - Result Re-Ranker'].json['output']['Highest_RANKEDURL_3']['title'] }}\",\n \"link\": \"{{ $item('0').$node['Semantic Search - Result Re-Ranker'].json['output']['Highest_RANKEDURL_3']['link'] }}\",\n \"description\": \"{{ $item('0').$node['Semantic Search - Result Re-Ranker'].json['output']['Highest_RANKEDURL_3']['description'] }}\"\n },\n \"Highest_RANKEDURL_4\": {\n \"title\": \"{{ $item('0').$node['Semantic Search - Result Re-Ranker'].json['output']['Highest_RANKEDURL_4']['title'] }}\",\n \"link\": \"{{ $item('0').$node['Semantic Search - Result Re-Ranker'].json['output']['Highest_RANKEDURL_4']['link'] }}\",\n \"description\": \"{{ $item('0').$node['Semantic Search - Result Re-Ranker'].json['output']['Highest_RANKEDURL_4']['description'] }}\"\n },\n \"Highest_RANKEDURL_5\": {\n \"title\": \"{{ $item('0').$node['Semantic Search - Result Re-Ranker'].json['output']['Highest_RANKEDURL_5']['title'] }}\",\n \"link\": \"{{ $item('0').$node['Semantic Search - Result Re-Ranker'].json['output']['Highest
```

