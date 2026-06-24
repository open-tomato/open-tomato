---
tags: [n8n, cms, wordpress, notion, airtable, webflow, productivity]
category: cms-productivity
description: Content management systems and productivity database platforms
---

# CMS & Productivity Tools

## Overview
Content management systems and productivity database platforms.

## Nodes in This Category

---

### Wordpress
**Type**: `n8n-nodes-base.wordpress`  
**Description**: Create, update and retrieve WordPress posts, pages and media.  
**Auth Required**: `wordpressApi`  
**Usage Count**: 13 templates

#### Common Operations/Modes
- `get`
- `getAll`
- `update`

#### Usage Examples

##### Example 1: WordPress - Get Post2
**Source**: `examples/OpenAI_and_LLMs/AI-Generated Summary Block for WordPress Posts.json`  
**Workflow**: AI-Generated Summary Block for WordPress Posts - with OpenAI, WordPress, Google Sheets & Slack

**Credentials**: `{{CREDENTIAL_wordpressApi}}`

**Configuration**:
```json
{
  "postId": "={{ $('Loop Over Items').item.json.id }}",
  "options": {
    "context": "edit"
  },
  "operation": "get"
}
```

##### Example 2: WordPress - Get Last Posts
**Source**: `examples/OpenAI_and_LLMs/AI-Generated Summary Block for WordPress Posts.json`  
**Workflow**: AI-Generated Summary Block for WordPress Posts - with OpenAI, WordPress, Google Sheets & Slack

**Credentials**: `{{CREDENTIAL_wordpressApi}}`

**Configuration**:
```json
{
  "options": {
    "after": "={{ $json.last_execution_date }}",
    "context": "edit"
  },
  "operation": "getAll"
}
```

##### Example 3: Wordpress
**Source**: `examples/OpenAI_and_LLMs/Enrich FAQ sections on your website pages at scale with AI.json`  
**Workflow**: Enrich FAQ sections on your website pages at scale with AI

**Credentials**: `{{CREDENTIAL_wordpressApi}}`

**Configuration**:
```json
{
  "additionalFields": {}
}
```

##### Example 4: Wordpress
**Source**: `examples/WordPress/Auto-Categorize blog posts in wordpress using A.I..json`  
**Workflow**: Auto categorize wordpress template

**Credentials**: `{{CREDENTIAL_wordpressApi}}`

**Configuration**:
```json
{
  "postId": "={{ $('Get All Wordpress Posts').item.json.id }}",
  "operation": "update",
  "updateFields": {
    "categories": "={{ $json.output }}"
  }
}
```

##### Example 5: Get All Wordpress Posts
**Source**: `examples/WordPress/Auto-Categorize blog posts in wordpress using A.I..json`  
**Workflow**: Auto categorize wordpress template

**Credentials**: `{{CREDENTIAL_wordpressApi}}`

**Configuration**:
```json
{
  "options": {},
  "operation": "getAll",
  "returnAll": true
}
```


---

### Notion
**Type**: `n8n-nodes-base.notion`  
**Description**: Create, update and query Notion pages and databases.  
**Auth Required**: `notionApi`  
**Usage Count**: 15 templates

#### Common Operations/Modes
- `database`
- `databasePage`
- `getAll`
- `update`

#### Usage Examples

##### Example 1: Get issue contents
**Source**: `examples/Linear/Create Linear tickets from Notion content.json`  
**Workflow**: Create Linear tickets from Notion content

**Credentials**: `{{CREDENTIAL_notionApi}}`

**Configuration**:
```json
{
  "blockId": {
    "__rl": true,
    "mode": "id",
    "value": "={{ $('Set assignee and title').item.json.id }}"
  },
  "resource": "block",
  "operation": "getAll",
  "returnAll": true,
  "simplifyOutput": false,
  "fetchNestedBlocks": true
}
```

##### Example 2: Get issues
**Source**: `examples/Linear/Create Linear tickets from Notion content.json`  
**Workflow**: Create Linear tickets from Notion content

**Credentials**: `{{CREDENTIAL_notionApi}}`

**Configuration**:
```json
{
  "blockId": {
    "__rl": true,
    "mode": "url",
    "value": "={{ $('n8n Form Trigger').item.json['Notion page URL'] }}"
  },
  "resource": "block",
  "operation": "getAll",
  "returnAll": true,
  "simplifyOutput": false
}
```

##### Example 3: Notion
**Source**: `examples/Notion/Add positive feedback messages to a table in Notion.json`  
**Workflow**: Add positive feedback messages to a table in Notion

**Credentials**: `{{CREDENTIAL_notionApi}}`

**Configuration**:
```json
{
  "resource": "databasePage",
  "databaseId": "{{UUID}}",
  "propertiesUi": {
    "propertyValues": [
      {
        "key": "Name|title",
        "title": "={{$node[\"Typeform Trigger\"].json[\"Name\"]}}"
      },
      {
        "key": "Feedback|rich_text",
        "textContent": "={{$node[\"Typeform Trigger\"].json[\"Any suggestions for us? \"]}}"
      }
    ]
  }
}
```

##### Example 4: Check Paper URL Existed
**Source**: `examples/Notion/Analyse papers from Hugging Face with AI and store them in Notion.json`  
**Workflow**: Hugging Face to Notion

**Credentials**: `{{CREDENTIAL_notionApi}}`

**Configuration**:
```json
{
  "filters": {
    "conditions": [
      {
        "key": "URL|url",
        "urlValue": "={{ 'https://huggingface.co'+$json.url }}",
        "condition": "equals"
      }
    ]
  },
  "options": {},
  "resource": "databasePage",
  "operation": "getAll",
  "databaseId": {
    "__rl": true,
    "mode": "list",
    "value": "{{UUID}}",
    "cachedResultUrl": "https://www.notion.so/17b67aba1fcc80aebaa1d88ffda7ae83",
    "cachedResultName": "huggingface-abstract"
  },
  "filterType": "manual"
}
```

##### Example 5: Store Abstract Notion
**Source**: `examples/Notion/Analyse papers from Hugging Face with AI and store them in Notion.json`  
**Workflow**: Hugging Face to Notion

**Credentials**: `{{CREDENTIAL_notionApi}}`

**Configuration**:
```json
{
  "options": {},
  "resource": "databasePage",
  "databaseId": {
    "__rl": true,
    "mode": "list",
    "value": "{{UUID}}",
    "cachedResultUrl": "https://www.notion.so/17b67aba1fcc80aebaa1d88ffda7ae83",
    "cachedResultName": "huggingface-abstract"
  },
  "propertiesUi": {
    "propertyValues": [
      {
        "key": "URL|url",
        "urlValue": "={{ 'https://huggingface.co'+$('Split Out').item.json.url }}"
      },
      {
        "key": "title|title",
        "title": "={{ $('Extract Hugging Face Paper Abstract').item.json.title }}"
      },
      {
        "key": "abstract|rich_text",
        "textContent": "={{ $('Extract Hugging Face Paper Abstract').item.json.abstract.substring(0,2000) }}"
      },
      {
        "key": "scrap-date|date",
        "date": "={{ $today.format('yyyy-MM-dd') }}",
        "includeTime": false
      },
      {
        "key": "Classification|rich_text",
        "textContent": "={{ $json.message.content.Classification.join(',') }}"
      },
      {
        "key": "Technical_Details|rich_text",
        "textContent": "={{ $json.message.content.Technical_Details }}"
      },
      {
        "key": "Data_and_Results|rich_text",
        "textContent": "={{ $json.message.content.Data_and_Results }}"
      },
      {
        "key": "keywords|rich_text",
        "textContent": "={{ $json.message.content.Keywords.join(',') }}"
      },
      {
        "key": "Core Introduction|rich_text",
        "textContent": "={{ $json.message.content.Core_Introduction }}"
      }
    ]
  }
}
```


---

### NotionTool
**Type**: `n8n-nodes-base.notionTool`  
**Description**: Wraps Notion as an AI agent tool.  
**Auth Required**: `notionApi`  
**Usage Count**: 1 templates

#### Common Operations/Modes
- `search`

#### Usage Examples

##### Example 1: Query KnowledgeBase
**Source**: `examples/OpenAI_and_LLMs/Automate Customer Support Issue Resolution using AI Text Classifier.json`  
**Workflow**: Automate Customer Support Issue Resolution using AI Text Classifier

**Credentials**: `{{CREDENTIAL_notionApi}}`

**Configuration**:
```json
{
  "text": "={{ $fromAI('search_terms', 'relevant terms to search for information on the current issue', 'string', '') }}",
  "limit": 4,
  "options": {},
  "operation": "search",
  "descriptionType": "manual",
  "toolDescription": "Search the knowledgebase for information relevant to the issue."
}
```

**Prompt/System Message**:
```
={{ $fromAI('search_terms', 'relevant terms to search for information on the current issue', 'string', '') }}
```


---

### Airtable
**Type**: `n8n-nodes-base.airtable`  
**Description**: Read, create, update and delete Airtable records.  
**Auth Required**: `airtableApi`, `airtableTokenApi`  
**Usage Count**: 69 templates

#### Common Operations/Modes
- `append`
- `base`
- `create`
- `get`
- `getSchema`
- `list`
- `search`
- `update`
- `upsert`

#### Usage Examples

##### Example 1: Save to Tracker
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Deduplicate Scraping AI Grants for Eligibility using AI.json`  
**Workflow**: Deduplicate Scraping AI Grants for Eligibility using AI

**Credentials**: `{{CREDENTIAL_airtableTokenApi}}`

**Configuration**:
```json
{
  "base": {
    "__rl": true,
    "mode": "list",
    "value": "appiNoPRvhJxz9crl",
    "cachedResultUrl": "https://airtable.com/appiNoPRvhJxz9crl",
    "cachedResultName": "US Grants.gov Tracker"
  },
  "table": {
    "__rl": true,
    "mode": "list",
    "value": "tblX93C9MNzizhibd",
    "cachedResultUrl": "https://airtable.com/appiNoPRvhJxz9crl/tblX93C9MNzizhibd",
    "cachedResultName": "Table 1"
  },
  "columns": {
    "value": {
      "URL": "=https://grants.gov/search-results-detail/{{ $('Get Grant Details').item.json.id }}",
      "Goal": "={{ $json.output.goal }}",
      "Notes": "={{ $json.output.good_to_know.join('\\n') }}",
      "Title": "={{ $('Get Grant Details').item.json.opportunityTitle }}",
      "Agency": "={{ $('Get Grant Details').item.json.synopsis.agencyContactName }}",
      "Status": "New",
      "Funding": "={{ $('Get Grant Details').item.json.synopsis.estimatedFunding }}",
      "Duration": "={{ $json.output.duration }}",
      "Award Floor": "={{ $('Get Grant Details').item.json.synopsis.awardFloor }}",
      "Posted Date": "={{ $('Get Grant Details').item.json.synopsis.postingDate }}",
      "Agency Email": "={{ $('Get Grant Details').item.json.synopsis.agencyContactEmail }}",
      "Agency Phone": "={{ $('Get Grant Details').item.json.synopsis.agencyContactPhone }}",
      "Eligibility?": "={{ $json.output.eligibility_matches.length > 0 ? 'Yes' : 'No' }}",
      "Award Ceiling": "={{ $('Get Grant Details').item.json.synopsis.awardCeiling }}",
      "Response Date": "={{ $('Get Grant Details').item.json.synopsis.responseDate }}",
      "Success Criteria": "={{ $json.output.success_criteria.join('\\n') }}",
      "Eligibility Notes": "={{ $json.output.eligibility_matches.join('\\n') }}",
      "Opportunity Number": "={{ $('Get Grant Details').item.json.opportunityNumber }}"
    },
    "schema": [
      {
        "type": "string",
        "display": true,
        "removed": false,
        "readOnly": false,
        "required": false,
  
```

##### Example 2: Get New Eligible Grants Today
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Deduplicate Scraping AI Grants for Eligibility using AI.json`  
**Workflow**: Deduplicate Scraping AI Grants for Eligibility using AI

**Credentials**: `{{CREDENTIAL_airtableTokenApi}}`

**Configuration**:
```json
{
  "base": {
    "__rl": true,
    "mode": "list",
    "value": "appiNoPRvhJxz9crl",
    "cachedResultUrl": "https://airtable.com/appiNoPRvhJxz9crl",
    "cachedResultName": "US Grants.gov Tracker"
  },
  "table": {
    "__rl": true,
    "mode": "list",
    "value": "tblX93C9MNzizhibd",
    "cachedResultUrl": "https://airtable.com/appiNoPRvhJxz9crl/tblX93C9MNzizhibd",
    "cachedResultName": "Table 1"
  },
  "options": {},
  "operation": "search",
  "filterByFormula": "=AND(\n {Status} = 'New',\n {Eligibility?} = 'Yes',\n IS_SAME(DATETIME_FORMAT(Created, 'YYYY-MM-DD'), DATETIME_FORMAT(TODAY(), 'YYYY-MM-DD'))\n)"
}
```

##### Example 3: Get Applicable Rows
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Enrich Property Inventory Survey with Image Recognition and AI Agent.json`  
**Workflow**: Enrich Property Inventory Survey with Image Recognition and AI Agent

**Credentials**: `{{CREDENTIAL_airtableTokenApi}}`

**Configuration**:
```json
{
  "base": {
    "__rl": true,
    "mode": "list",
    "value": "appbgxPBurOmQK3E7",
    "cachedResultUrl": "https://airtable.com/appbgxPBurOmQK3E7",
    "cachedResultName": "Building Inventory Survey Example"
  },
  "table": {
    "__rl": true,
    "mode": "id",
    "value": "tblEHkoTvKpa4Aa0Q"
  },
  "options": {},
  "operation": "search",
  "returnAll": false,
  "filterByFormula": "AND(Image!=\"\", AI_status=FALSE())"
}
```

##### Example 4: Enrich Product Rows
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Enrich Property Inventory Survey with Image Recognition and AI Agent.json`  
**Workflow**: Enrich Property Inventory Survey with Image Recognition and AI Agent

**Credentials**: `{{CREDENTIAL_airtableTokenApi}}`

**Configuration**:
```json
{
  "base": {
    "__rl": true,
    "mode": "list",
    "value": "appbgxPBurOmQK3E7",
    "cachedResultUrl": "https://airtable.com/appbgxPBurOmQK3E7",
    "cachedResultName": "Building Inventory Survey Example"
  },
  "table": {
    "__rl": true,
    "mode": "id",
    "value": "tblEHkoTvKpa4Aa0Q"
  },
  "columns": {
    "value": {
      "Color": "={{ $json.output.output.color }}",
      "Model": "={{ $json.output.output.model }}",
      "Title": "={{ $json.output.output.title }}",
      "Material": "={{ $json.output.output.material }}",
      "AI_status": true,
      "Condition": "={{ $json.output.output.condition }}",
      "Description": "={{ $json.output.output.description }}"
    },
    "schema": [
      {
        "type": "string",
        "display": true,
        "removed": false,
        "readOnly": true,
        "required": false,
        "displayName": "id",
        "defaultMatch": true
      },
      {
        "type": "string",
        "display": true,
        "removed": false,
        "readOnly": false,
        "required": false,
        "displayName": "Title",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "array",
        "display": true,
        "removed": false,
        "readOnly": false,
        "required": false,
        "displayName": "Image",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "removed": false,
        "readOnly": false,
        "required": false,
        "displayName": "Description",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "removed": false,
        "readOnly": false,
        "required": false,
        "displayName": "Model",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "removed": false,
        "readOnly
```

##### Example 5: Get Bases
**Source**: `examples/Airtable/AI Agent to chat with Airtable and analyze data.json`  
**Workflow**: AI Agent to chat with Airtable and analyze data

**Credentials**: `{{CREDENTIAL_airtableTokenApi}}`

**Configuration**:
```json
{
  "options": {},
  "resource": "base"
}
```


---

### AirtableTool
**Type**: `n8n-nodes-base.airtableTool`  
**Description**: Wraps Airtable as an AI agent tool.  
**Auth Required**: `airtableTokenApi`  
**Usage Count**: 9 templates

#### Common Operations/Modes
- `search`

#### Usage Examples

##### Example 1: Airtable
**Source**: `examples/Airtable/Get Airtable data via AI and Obsidian Notes.json`  
**Workflow**: Get Airtable data in Obsidian Notes

**Credentials**: `{{CREDENTIAL_airtableTokenApi}}`

**Configuration**:
```json
{
  "base": {
    "__rl": true,
    "mode": "list",
    "value": "appP3ocJy1rXIo6ko",
    "cachedResultUrl": "https://airtable.com/appP3ocJy1rXIo6ko",
    "cachedResultName": "table"
  },
  "table": {
    "__rl": true,
    "mode": "list",
    "value": "tblywtlpPtGQMTJRm",
    "cachedResultUrl": "https://airtable.com/appP3ocJy1rXIo6ko/tblywtlpPtGQMTJRm",
    "cachedResultName": "Dummy"
  },
  "options": {},
  "operation": "search"
}
```

##### Example 2: candidate_insights
**Source**: `examples/HR_and_Recruitment/HR Job Posting and Evaluation with AI.json`  
**Workflow**: HR Job Posting and Evaluation with AI

**Credentials**: `{{CREDENTIAL_airtableTokenApi}}`

**Configuration**:
```json
{
  "base": {
    "__rl": true,
    "mode": "list",
    "value": "appublMkWVQfHkZ09",
    "cachedResultUrl": "https://airtable.com/appublMkWVQfHkZ09",
    "cachedResultName": "Simple applicant tracker"
  },
  "table": {
    "__rl": true,
    "mode": "list",
    "value": "tblllvQaRTSnEr17a",
    "cachedResultUrl": "https://airtable.com/appublMkWVQfHkZ09/tblllvQaRTSnEr17a",
    "cachedResultName": "Applicants"
  },
  "options": {}
}
```

##### Example 3: Background Info
**Source**: `examples/OpenAI_and_LLMs/AI Social Media Caption Creator creates social media post captions in Airtable.json`  
**Workflow**: AI Social Media Caption Creator

**Credentials**: `{{CREDENTIAL_airtableTokenApi}}`

**Configuration**:
```json
{
  "base": {
    "__rl": true,
    "mode": "list",
    "value": "appXvZviYORVbPEaS",
    "cachedResultUrl": "https://airtable.com/appXvZviYORVbPEaS",
    "cachedResultName": "Redaktionsplan 2025 - E&P Reisen"
  },
  "table": {
    "__rl": true,
    "mode": "list",
    "value": "tblMmE9cjgNZCoIO1",
    "cachedResultUrl": "https://airtable.com/appLe3fQHeaRN7kWG/tblMmE9cjgNZCoIO1",
    "cachedResultName": "Good to know"
  },
  "options": {},
  "descriptionType": "manual",
  "toolDescription": "Read data from Airtable"
}
```

##### Example 4: Airtable1
**Source**: `examples/HR_and_Recruitment/HR Job Posting and Evaluation with AI.json`  
**Workflow**: HR Job Posting and Evaluation with AI

**Credentials**: `{{CREDENTIAL_airtableTokenApi}}`

**Configuration**:
```json
{
  "base": {
    "__rl": true,
    "mode": "list",
    "value": "appublMkWVQfHkZ09",
    "cachedResultUrl": "https://airtable.com/appublMkWVQfHkZ09",
    "cachedResultName": "Simple applicant tracker"
  },
  "table": {
    "__rl": true,
    "mode": "list",
    "value": "tbljhmLdPULqSya0d",
    "cachedResultUrl": "https://airtable.com/appublMkWVQfHkZ09/tbljhmLdPULqSya0d",
    "cachedResultName": "Positions"
  },
  "options": {},
  "operation": "search"
}
```

##### Example 5: Airtable2
**Source**: `examples/HR_and_Recruitment/HR Job Posting and Evaluation with AI.json`  
**Workflow**: HR Job Posting and Evaluation with AI

**Credentials**: `{{CREDENTIAL_airtableTokenApi}}`

**Configuration**:
```json
{
  "base": {
    "__rl": true,
    "mode": "list",
    "value": "appublMkWVQfHkZ09",
    "cachedResultUrl": "https://airtable.com/appublMkWVQfHkZ09",
    "cachedResultName": "Simple applicant tracker"
  },
  "table": {
    "__rl": true,
    "mode": "list",
    "value": "tbljhmLdPULqSya0d",
    "cachedResultUrl": "https://airtable.com/appublMkWVQfHkZ09/tbljhmLdPULqSya0d",
    "cachedResultName": "Positions"
  },
  "options": {},
  "operation": "search"
}
```


---

### AirtableTrigger
**Type**: `n8n-nodes-base.airtableTrigger`  
**Description**: n8n node for airtableTrigger operations.  
**Auth Required**: `airtableTokenApi`  
**Usage Count**: 3 templates

#### Usage Examples

##### Example 1: Airtable Trigger
**Source**: `examples/Linear/Sentiment analysis tracking on support issues with Linear and Slack.json`  
**Workflow**: Sentiment analysis tracking on support issues with Linear and Slack

**Credentials**: `{{CREDENTIAL_airtableTokenApi}}`

**Configuration**:
```json
{
  "baseId": {
    "__rl": true,
    "mode": "id",
    "value": "appViDaeaFw4qv9La"
  },
  "tableId": {
    "__rl": true,
    "mode": "id",
    "value": "tblhO0sfRhKP6ibS8"
  },
  "pollTimes": {
    "item": [
      {
        "mode": "everyHour"
      }
    ]
  },
  "triggerField": "Current Sentiment",
  "authentication": "airtableTokenApi",
  "additionalFields": {}
}
```

##### Example 2: Airtable Trigger: New Record
**Source**: `examples/OpenAI_and_LLMs/AI Social Media Caption Creator creates social media post captions in Airtable.json`  
**Workflow**: AI Social Media Caption Creator

**Credentials**: `{{CREDENTIAL_airtableTokenApi}}`

**Configuration**:
```json
{
  "baseId": {
    "__rl": true,
    "mode": "id",
    "value": "appXvZviYORVbPEaS"
  },
  "tableId": {
    "__rl": true,
    "mode": "id",
    "value": "tblxsKj5PtumCR9um"
  },
  "pollTimes": {
    "item": [
      {
        "mode": "everyMinute"
      }
    ]
  },
  "triggerField": "created_at",
  "authentication": "airtableTokenApi",
  "additionalFields": {}
}
```

##### Example 3: Airtable Trigger
**Source**: `examples/Slack/Sentiment Analysis Tracking on Support Issues with Linear and Slack.json`  
**Workflow**: Sentiment Analysis Tracking on Support Issues with Linear and Slack

**Credentials**: `{{CREDENTIAL_airtableTokenApi}}`

**Configuration**:
```json
{
  "baseId": {
    "__rl": true,
    "mode": "id",
    "value": "appViDaeaFw4qv9La"
  },
  "tableId": {
    "__rl": true,
    "mode": "id",
    "value": "tblhO0sfRhKP6ibS8"
  },
  "pollTimes": {
    "item": [
      {
        "mode": "everyHour"
      }
    ]
  },
  "triggerField": "Current Sentiment",
  "authentication": "airtableTokenApi",
  "additionalFields": {}
}
```


---

### Webflow
**Type**: `n8n-nodes-base.webflow`  
**Description**: n8n node for webflow operations.  
**Auth Required**: `webflowOAuth2Api`  
**Usage Count**: 2 templates

#### Common Operations/Modes
- `create`

#### Usage Examples

##### Example 1: Webflow
**Source**: `examples/OpenAI_and_LLMs/Enrich FAQ sections on your website pages at scale with AI.json`  
**Workflow**: Enrich FAQ sections on your website pages at scale with AI

**Configuration**:
```json
{
  "operation": "create"
}
```

##### Example 2: Webflow
**Source**: `examples/Other_Integrations_and_Use_Cases/Generate & publish SEO articles with Claude AI, Webflow & image generation.json`  
**Workflow**: Copycat SEO article (public version)

**Credentials**: `{{CREDENTIAL_webflowOAuth2Api}}`

**Configuration**:
```json
{
  "live": true,
  "siteId": "648717e882e5860a12ab9d1c",
  "fieldsUi": {
    "fieldValues": [
      {
        "fieldId": "cover-image",
        "fieldValue": "={{ $('get_image_url').item.json.output }}"
      },
      {
        "fieldId": "name",
        "fieldValue": "={{ $('Content writer').item.json.output.article.match(/<h2>(.*?)<\\/h2>/)?.[1].trim() || '' }}"
      },
      {
        "fieldId": "article-body-text",
        "fieldValue": "={{ $('Content writer').item.json.output.article.replace(/<h1>|<\\/h1>/g, '') }}"
      },
      {
        "fieldId": "read-time",
        "fieldValue": "5 min"
      },
      {
        "fieldId": "short-paragraph",
        "fieldValue": "={{ $('Content writer').item.json.output.summary }}"
      },
      {
        "fieldId": "first-post-image",
        "fieldValue": "={{ $('get_image_url').item.json.output }}"
      }
    ]
  },
  "operation": "create",
  "collectionId": "64b1bae9c2d06f1241365376"
}
```


---

### WebflowTool
**Type**: `n8n-nodes-base.webflowTool`  
**Description**: n8n node for webflowTool operations.  
**Auth Required**: `webflowOAuth2Api`  
**Usage Count**: 1 templates

#### Common Operations/Modes
- `getAll`

#### Usage Examples

##### Example 1: Get Articles
**Source**: `examples/Other_Integrations_and_Use_Cases/Generate & publish SEO articles with Claude AI, Webflow & image generation.json`  
**Workflow**: Copycat SEO article (public version)

**Credentials**: `{{CREDENTIAL_webflowOAuth2Api}}`

**Configuration**:
```json
{
  "siteId": "648717e882e5860a12ab9d1c",
  "operation": "getAll",
  "collectionId": "64b1bae9c2d06f1241365376",
  "descriptionType": "manual",
  "toolDescription": "Get URLs of current related articles on productai.photo so they can be used ad internal links."
}
```


---

### Strapi
**Type**: `n8n-nodes-base.strapi`  
**Description**: n8n node for strapi operations.  
**Auth Required**: `strapiApi`  
**Usage Count**: 3 templates

#### Common Operations/Modes
- `create`

#### Usage Examples

##### Example 1: Strapi
**Source**: `examples/OpenAI_and_LLMs/Enrich FAQ sections on your website pages at scale with AI.json`  
**Workflow**: Enrich FAQ sections on your website pages at scale with AI

**Configuration**:
```json
{
  "operation": "create"
}
```

##### Example 2: Store in Strapi
**Source**: `examples/Other_Integrations_and_Use_Cases/Automate testimonials in Strapi with n8n.json`  
**Workflow**: Automate testimonials in Strapi with n8n

**Credentials**: `{{CREDENTIAL_strapiApi}}`

**Configuration**:
```json
{
  "columns": "Content,Author,Created,URL",
  "operation": "create",
  "contentType": "posts"
}
```

##### Example 3: Store Form Submission in Strapi
**Source**: `examples/Other_Integrations_and_Use_Cases/Automate testimonials in Strapi with n8n.json`  
**Workflow**: Automate testimonials in Strapi with n8n

**Credentials**: `{{CREDENTIAL_strapiApi}}`

**Configuration**:
```json
{
  "columns": "Content,Author,Created,URL",
  "operation": "create",
  "contentType": "posts"
}
```


---

### Todoist
**Type**: `n8n-nodes-base.todoist`  
**Description**: n8n node for todoist operations.  
**Auth Required**: `todoistApi`  
**Usage Count**: 2 templates

#### Common Operations/Modes
- `getAll`
- `update`

#### Usage Examples

##### Example 1: Update priority in todoist
**Source**: `examples/Other_Integrations_and_Use_Cases/Use AI to organize your Todoist Inbox.json`  
**Workflow**: Use AI to organize your Todoist Inbox

**Credentials**: `{{CREDENTIAL_todoistApi}}`

**Configuration**:
```json
{
  "taskId": "={{ $('Get inbox tasks').item.json.id }}",
  "operation": "update",
  "updateFields": {
    "priority": "={{ $('Your Projects').first().json.projects[$json.message.content] }}"
  }
}
```

##### Example 2: Get inbox tasks
**Source**: `examples/Other_Integrations_and_Use_Cases/Use AI to organize your Todoist Inbox.json`  
**Workflow**: Use AI to organize your Todoist Inbox

**Credentials**: `{{CREDENTIAL_todoistApi}}`

**Configuration**:
```json
{
  "filters": {
    "projectId": "938017196"
  },
  "operation": "getAll",
  "returnAll": true
}
```


---

### Trello
**Type**: `n8n-nodes-base.trello`  
**Description**: n8n node for trello operations.  
**Auth Required**: `trelloApi`  
**Usage Count**: 1 templates

#### Usage Examples

##### Example 1: Trello
**Source**: `examples/Notion/Add positive feedback messages to a table in Notion.json`  
**Workflow**: Add positive feedback messages to a table in Notion

**Credentials**: `{{CREDENTIAL_trelloApi}}`

**Configuration**:
```json
{
  "name": "=Score: {{$json[\"documentSentiment\"][\"score\"]}}",
  "listId": "5fbb9e2eb1d5cc0a8a7ab8ac",
  "description": "=Score: {{$json[\"documentSentiment\"][\"score\"]}}\nFeedback: {{$node[\"Typeform Trigger\"].json[\"Any suggestions for us? \"]}}\nUser: {{$node[\"Typeform Trigger\"].json[\"Name\"]}}",
  "additionalFields": {}
}
```


---

### MondayCom
**Type**: `n8n-nodes-base.mondayCom`  
**Description**: n8n node for mondayCom operations.  
**Auth Required**: `mondayComApi`  
**Usage Count**: 1 templates

#### Common Operations/Modes
- `getAll`

#### Usage Examples

##### Example 1: Monday.com - Get Contacts
**Source**: `examples/Gmail_and_Email_Automation/Microsoft Outlook AI Email Assistant with contact support from Monday and Airtable.json`  
**Workflow**: Microsoft Outlook AI Email Assistant

**Credentials**: `{{CREDENTIAL_mondayComApi}}`

**Configuration**:
```json
{
  "boardId": "1840712625",
  "groupId": "topics",
  "resource": "boardItem",
  "operation": "getAll",
  "returnAll": true
}
```

