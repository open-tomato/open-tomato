---
tags: [n8n, flow-control, branching, merging, batching, filtering]
category: flow-control
description: Nodes for branching logic, merging streams, batching, filtering, and flow orchestration
---

# Flow Control & Data Routing

## Overview
Nodes for branching logic, merging streams, batching, filtering, and flow orchestration.

## Nodes in This Category

---

### If
**Type**: `n8n-nodes-base.if`  
**Description**: Routes items through true/false branches based on one or more conditions.  
**Auth Required**: `none`  
**Usage Count**: 163 templates

#### Usage Examples

##### Example 1: Has Existing Point?
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Financial Documents Assistant using Qdrant and Mistral.ai.json`  
**Workflow**: Build a Financial Documents Assistant using Qdrant and Mistral.ai

**Configuration**:
```json
{
  "options": {},
  "conditions": {
    "options": {
      "leftValue": "",
      "caseSensitive": true,
      "typeValidation": "strict"
    },
    "combinator": "and",
    "conditions": [
      {
        "operator": {
          "type": "array",
          "operation": "notEmpty",
          "singleValue": true
        },
        "leftValue": "={{ $json.result.points }}",
        "rightValue": ""
      }
    ]
  }
}
```

##### Example 2: If
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Scrape Trustpilot Reviews with DeepSeek, Analyze Sentiment with OpenAI.json`  
**Workflow**: Scrape Trustpilot Reviews with DeepSeek, Analyze Sentiment with OpenAI

**Configuration**:
```json
{
  "options": {},
  "conditions": {
    "options": {
      "version": 2,
      "leftValue": "",
      "caseSensitive": true,
      "typeValidation": "loose"
    },
    "combinator": "and",
    "conditions": [
      {
        "operator": {
          "type": "string",
          "operation": "empty",
          "singleValue": true
        },
        "leftValue": "={{ $json.Valutazione }}",
        "rightValue": "={{ $('Split Out').item.json.recensioni.replace('/reviews/','') }}"
      }
    ]
  },
  "looseTypeValidation": true
}
```

##### Example 3: IF
**Source**: `examples/Airtable/vAssistant for Hubspot Chat using OpenAi and Airtable.json`  
**Workflow**: OpenAI Assistant for Hubspot Chat

**Configuration**:
```json
{
  "conditions": {
    "string": [
      {
        "value1": "={{ $('getHubspotMessage').item.json[\"senders\"][0][\"actorId\"] }}",
        "value2": "A-5721819",
        "operation": "notEqual"
      }
    ]
  }
}
```

##### Example 4: Only continue for specific emails
**Source**: `examples/Gmail_and_Email_Automation/Send a ChatGPT email reply and save responses to Google Sheets.json`  
**Workflow**: Send a ChatGPT email reply and save responses to Google Sheets

**Configuration**:
```json
{
  "conditions": {
    "string": [
      {
        "value1": "={{ $('Configure').first().json.recipients.split(',') }}",
        "value2": "*",
        "operation": "contains"
      },
      {
        "value1": "={{ $('Configure').first().json.recipients.split(',') }}",
        "value2": "={{ $json.from.value[0].address }}",
        "operation": "contains"
      }
    ]
  },
  "combineOperation": "any"
}
```

##### Example 5: Has Existing Point?1
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Financial Documents Assistant using Qdrant and Mistral.ai.json`  
**Workflow**: Build a Financial Documents Assistant using Qdrant and Mistral.ai

**Configuration**:
```json
{
  "options": {},
  "conditions": {
    "options": {
      "leftValue": "",
      "caseSensitive": true,
      "typeValidation": "strict"
    },
    "combinator": "and",
    "conditions": [
      {
        "operator": {
          "type": "array",
          "operation": "notEmpty",
          "singleValue": true
        },
        "leftValue": "={{ $json.result.points }}",
        "rightValue": ""
      }
    ]
  }
}
```


---

### Switch
**Type**: `n8n-nodes-base.switch`  
**Description**: Routes items to one of N outputs based on a value match. Replace with textClassifier for AI-based routing.  
**Auth Required**: `none`  
**Usage Count**: 65 templates

#### Common Operations/Modes
- `expression`

#### Usage Examples

##### Example 1: Handle File Event
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Financial Documents Assistant using Qdrant and Mistral.ai.json`  
**Workflow**: Build a Financial Documents Assistant using Qdrant and Mistral.ai

**Configuration**:
```json
{
  "rules": {
    "values": [
      {
        "outputKey": "file_deleted",
        "conditions": {
          "options": {
            "leftValue": "",
            "caseSensitive": true,
            "typeValidation": "strict"
          },
          "combinator": "and",
          "conditions": [
            {
              "operator": {
                "type": "string",
                "operation": "notEmpty",
                "singleValue": true
              },
              "leftValue": "={{ $json.file_deleted }}",
              "rightValue": ""
            }
          ]
        },
        "renameOutput": true
      },
      {
        "outputKey": "file_changed",
        "conditions": {
          "options": {
            "leftValue": "",
            "caseSensitive": true,
            "typeValidation": "strict"
          },
          "combinator": "and",
          "conditions": [
            {
              "operator": {
                "type": "string",
                "operation": "notEmpty",
                "singleValue": true
              },
              "leftValue": "={{ $json.file_changed }}",
              "rightValue": ""
            }
          ]
        },
        "renameOutput": true
      },
      {
        "outputKey": "file_added",
        "conditions": {
          "options": {
            "leftValue": "",
            "caseSensitive": true,
            "typeValidation": "strict"
          },
          "combinator": "and",
          "conditions": [
            {
              "operator": {
                "type": "string",
                "operation": "notEmpty",
                "singleValue": true
              },
              "leftValue": "={{ $json.file_added }}",
              "rightValue": ""
            }
          ]
        },
        "renameOutput": true
      }
    ]
  },
  "options": {}
}
```

##### Example 2: Completed, Action or Inprogress
**Source**: `examples/Airtable/vAssistant for Hubspot Chat using OpenAi and Airtable.json`  
**Workflow**: OpenAI Assistant for Hubspot Chat

**Configuration**:
```json
{
  "rules": {
    "rules": [
      {
        "value2": "completed"
      },
      {
        "output": 1,
        "value2": "requires_action"
      },
      {
        "output": 2,
        "value2": "in_progress",
        "operation": "=equal"
      },
      {
        "output": 3,
        "value2": "queued"
      }
    ]
  },
  "value1": "={{ $json.status }}",
  "dataType": "string"
}
```

##### Example 3: Select category
**Source**: `examples/Discord/Discord AI-powered bot.json`  
**Workflow**: Discord AI bot

**Configuration**:
```json
{
  "rules": {
    "rules": [
      {
        "value2": "success-story"
      },
      {
        "output": 1,
        "value2": "urgent-issue"
      },
      {
        "output": 2,
        "value2": "ticket"
      }
    ]
  },
  "value1": "={{ $json.gpt_reply.category.toLowerCase() }}",
  "dataType": "string",
  "fallbackOutput": 3
}
```

##### Example 4: Switch
**Source**: `examples/Linear/AI-powered research assistant with Linear, Scrapeless, and Claude.json`  
**Workflow**: Build an AI-Powered Research Assistant with Linear + Scrapeless + Claude

**Configuration**:
```json
{
  "mode": "expression",
  "output": "={{\n  $json.type === 'Issue' && $json.data.title.toLowerCase().includes('/search') ? 0 :\n  $json.type === 'Issue' && $json.data.title.toLowerCase().includes('/trends') ? 1 :\n  $json.type === 'Issue' && $json.data.title.toLowerCase().includes('/unlock') ? 2 :\n  $json.type === 'Issue' && $json.data.title.toLowerCase().includes('/scrape') ? 3 :\n  $json.type === 'Issue' && $json.data.title.toLowerCase().includes('/crawl') ? 4 :\n  -1\n}}",
  "numberOutputs": 5
}
```

##### Example 5: Switch
**Source**: `examples/Telegram/Telegram AI Bot_ NeurochainAI Text & Image - NeurochainAI Basic API Integration.json`  
**Workflow**: NeurochainAI Basic API Integration

**Configuration**:
```json
{
  "rules": {
    "values": [
      {
        "outputKey": "Flux",
        "conditions": {
          "options": {
            "version": 2,
            "leftValue": "",
            "caseSensitive": false,
            "typeValidation": "loose"
          },
          "combinator": "and",
          "conditions": [
            {
              "operator": {
                "type": "string",
                "operation": "startsWith"
              },
              "leftValue": "={{ $json.message.text }}",
              "rightValue": "/flux"
            }
          ]
        },
        "renameOutput": true
      },
      {
        "outputKey": "text",
        "conditions": {
          "options": {
            "version": 2,
            "leftValue": "",
            "caseSensitive": false,
            "typeValidation": "loose"
          },
          "combinator": "and",
          "conditions": [
            {
              "operator": {
                "type": "string",
                "operation": "contains"
              },
              "leftValue": "={{ $json.message.text }}",
              "rightValue": "@NCNAI_BOT"
            }
          ]
        },
        "renameOutput": true
      },
      {
        "outputKey": "DM Text",
        "conditions": {
          "options": {
            "version": 2,
            "leftValue": "",
            "caseSensitive": false,
            "typeValidation": "loose"
          },
          "combinator": "and",
          "conditions": [
            {
              "operator": {
                "name": "filter.operator.equals",
                "type": "string",
                "operation": "equals"
              },
              "leftValue": "={{ $json.message.chat.type }}",
              "rightValue": "private"
            }
          ]
        },
        "renameOutput": true
      }
    ]
  },
  "options": {
    "ignoreCase": true
  },
  "looseTypeValidation": true
}
```


---

### Merge
**Type**: `n8n-nodes-base.merge`  
**Description**: Combines two or more input streams. Modes: append, mergeByIndex, mergeByKey, waitForAll.  
**Auth Required**: `none`  
**Usage Count**: 103 templates

#### Common Operations/Modes
- `chooseBranch`
- `combine`
- `mergeByIndex`

#### Usage Examples

##### Example 1: Merge all data
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Autonomous AI crawler.json`  
**Workflow**: Autonomous AI crawler

**Configuration**:
```json
{
  "mode": "combine",
  "options": {},
  "combinationMode": "mergeByPosition"
}
```

##### Example 2: Merge
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI.json`  
**Workflow**: Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI

**Configuration**:
```json
{
  "mode": "combine",
  "options": {},
  "combineBy": "combineAll"
}
```

##### Example 3: Merge1
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI.json`  
**Workflow**: Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI

**Configuration**:
```json
{
  "mode": "combine",
  "options": {},
  "fieldsToMatchString": "id"
}
```

##### Example 4: Merge
**Source**: `examples/Airtable/AI Agent to chat with Airtable and analyze data.json`  
**Workflow**: AI Agent to chat with Airtable and analyze data

##### Example 5: Merge1
**Source**: `examples/Gmail_and_Email_Automation/Auto Categorise Outlook Emails with AI.json`  
**Workflow**: Auto Categorise Outlook Emails with AI

**Configuration**:
```json
{
  "numberInputs": 7
}
```


---

### SplitOut
**Type**: `n8n-nodes-base.splitOut`  
**Description**: Splits an array field into individual items, one per output item.  
**Auth Required**: `none`  
**Usage Count**: 88 templates

#### Usage Examples

##### Example 1: Split out URLs
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Autonomous AI crawler.json`  
**Workflow**: Autonomous AI crawler

**Configuration**:
```json
{
  "options": {},
  "fieldToSplitOut": "output"
}
```

##### Example 2: Files as Items
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI.json`  
**Workflow**: Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI

**Configuration**:
```json
{
  "include": "allOtherFields",
  "options": {},
  "fieldToSplitOut": "$binary"
}
```

##### Example 3: Split - id, title, desc
**Source**: `examples/Other_Integrations_and_Use_Cases/Optimize & Update Printify Title and Description Workflow.json`  
**Workflow**: Printify Automation - Update Title and Description - AlexK1919

**Configuration**:
```json
{
  "include": "selectedOtherFields",
  "options": {},
  "fieldToSplitOut": "id",
  "fieldsToInclude": "title, description"
}
```

##### Example 4: Split Out Results Only
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build Your Own Image Search Using AI Object Detection, CDN and ElasticSearchBuild Your Own Image Search Using AI Object Detection, CDN and ElasticSearch.json`  
**Workflow**: Build Your Own Image Search Using AI Object Detection, CDN and ElasticSearchBuild Your Own Image Search Using AI Object Detection, CDN and ElasticSearch

**Configuration**:
```json
{
  "options": {},
  "fieldToSplitOut": "result"
}
```

##### Example 5: Split Out Chunks
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI.json`  
**Workflow**: Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI

**Configuration**:
```json
{
  "options": {},
  "fieldToSplitOut": "content"
}
```


---

### SplitInBatches
**Type**: `n8n-nodes-base.splitInBatches`  
**Description**: Processes items in configurable-size batches with loop-back support.  
**Auth Required**: `none`  
**Usage Count**: 51 templates

#### Usage Examples

##### Example 1: For Each Section...
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI.json`  
**Workflow**: Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI

**Configuration**:
```json
{
  "options": {},
  "batchSize": 5
}
```

##### Example 2: Loop Over Items
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Hacker News to Video Content.json`  
**Workflow**: Hacker News to Video Template - AlexK1919

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 3: Split Data for SerpAPI Batching
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Open Deep Research - AI-Powered Autonomous Research Workflow.json`  
**Workflow**: Open Deep Research - AI-Powered Autonomous Research Workflow

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 4: Split Data for Jina AI Batching
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Open Deep Research - AI-Powered Autonomous Research Workflow.json`  
**Workflow**: Open Deep Research - AI-Powered Autonomous Research Workflow

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 5: For Each Question...
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Survey Insights with Qdrant, Python and Information Extractor.json`  
**Workflow**: Survey Insights with Qdrant, Python and Information Extractor

**Configuration**:
```json
{
  "options": {}
}
```


---

### Aggregate
**Type**: `n8n-nodes-base.aggregate`  
**Description**: Aggregates multiple items into a single item with array fields.  
**Auth Required**: `none`  
**Usage Count**: 51 templates

#### Usage Examples

##### Example 1: Aggregate URLs
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Autonomous AI crawler.json`  
**Workflow**: Autonomous AI crawler

**Configuration**:
```json
{
  "include": "specifiedFields",
  "options": {},
  "aggregate": "aggregateAllItemData",
  "fieldsToInclude": "title,href"
}
```

##### Example 2: Aggregate
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI.json`  
**Workflow**: Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI

**Configuration**:
```json
{
  "options": {},
  "aggregate": "aggregateAllItemData",
  "destinationFieldName": "response"
}
```

##### Example 3: Aggregate for AI node
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Generate SEO Seed Keywords Using AI.json`  
**Workflow**: Generate SEO Seed Keywords Using AI

**Configuration**:
```json
{
  "options": {},
  "aggregate": "aggregateAllItemData"
}
```

##### Example 4: CombineIntoSingleText
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Learn Anything from HN - Get Top Resource Recommendations from Hacker News.json`  
**Workflow**: Learn Anything from HN - Get Top Resource Recommendations from Hacker News

**Configuration**:
```json
{
  "options": {},
  "fieldsToAggregate": {
    "fieldToAggregate": [
      {
        "fieldToAggregate": "text"
      }
    ]
  }
}
```

##### Example 5: Extract relevant employee fields
**Source**: `examples/HR_and_Recruitment/BambooHR AI-Powered Company Policies and Benefits Chatbot.json`  
**Workflow**: BambooHR AI-Powered Company Policies and Benefits Chatbot

**Configuration**:
```json
{
  "include": "specifiedFields",
  "options": {},
  "aggregate": "aggregateAllItemData",
  "fieldsToInclude": "id, displayName, jobTitle, workEmail",
  "destinationFieldName": "department_employees"
}
```


---

### Filter
**Type**: `n8n-nodes-base.filter`  
**Description**: Removes items that do not match a condition. Similar to IF but single output.  
**Auth Required**: `none`  
**Usage Count**: 47 templates

#### Usage Examples

##### Example 1: Filter out invalid URLs
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Autonomous AI crawler.json`  
**Workflow**: Autonomous AI crawler

**Configuration**:
```json
{
  "options": {},
  "conditions": {
    "options": {
      "leftValue": "",
      "caseSensitive": true,
      "typeValidation": "strict"
    },
    "combinator": "and",
    "conditions": [
      {
        "operator": {
          "type": "boolean",
          "operation": "true",
          "singleValue": true
        },
        "leftValue": "={{ $json.href.isUrl() }}",
        "rightValue": ""
      }
    ]
  }
}
```

##### Example 2: Filter
**Source**: `examples/Linear/Send alert when data is created in app-database.json`  
**Workflow**: Send alert when data is created in app-database

**Configuration**:
```json
{
  "conditions": {
    "number": [
      {
        "value1": "={{ $json.data.priority }}",
        "value2": 3,
        "operation": "largerEqual"
      }
    ],
    "string": [
      {
        "value1": "={{ $json.data.labels[0].name }}",
        "value2": "bug"
      }
    ]
  }
}
```

##### Example 3: Filter out empty hrefs
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Autonomous AI crawler.json`  
**Workflow**: Autonomous AI crawler

**Configuration**:
```json
{
  "options": {},
  "conditions": {
    "options": {
      "leftValue": "",
      "caseSensitive": true,
      "typeValidation": "strict"
    },
    "combinator": "and",
    "conditions": [
      {
        "operator": {
          "type": "string",
          "operation": "exists",
          "singleValue": true
        },
        "leftValue": "={{ $json.href }}",
        "rightValue": ""
      }
    ]
  }
}
```

##### Example 4: Filter Score >= 0.9
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build Your Own Image Search Using AI Object Detection, CDN and ElasticSearchBuild Your Own Image Search Using AI Object Detection, CDN and ElasticSearch.json`  
**Workflow**: Build Your Own Image Search Using AI Object Detection, CDN and ElasticSearchBuild Your Own Image Search Using AI Object Detection, CDN and ElasticSearch

**Configuration**:
```json
{
  "options": {},
  "conditions": {
    "options": {
      "leftValue": "",
      "caseSensitive": true,
      "typeValidation": "strict"
    },
    "combinator": "and",
    "conditions": [
      {
        "operator": {
          "type": "number",
          "operation": "gte"
        },
        "leftValue": "={{ $json.score }}",
        "rightValue": 0.9
      }
    ]
  }
}
```

##### Example 5: Only Valid Sections
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI.json`  
**Workflow**: Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI

**Configuration**:
```json
{
  "options": {},
  "conditions": {
    "options": {
      "leftValue": "",
      "caseSensitive": true,
      "typeValidation": "strict"
    },
    "combinator": "or",
    "conditions": [
      {
        "operator": {
          "type": "string",
          "operation": "notEmpty",
          "singleValue": true
        },
        "leftValue": "={{ $json.content }}",
        "rightValue": ""
      }
    ]
  }
}
```


---

### Limit
**Type**: `n8n-nodes-base.limit`  
**Description**: Keeps only the first N items from a stream.  
**Auth Required**: `none`  
**Usage Count**: 21 templates

#### Usage Examples

##### Example 1: Limit for testing (optional)
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Hacker News Job Listing Scraper and Parser.json`  
**Workflow**: HN Who is Hiring Scrape

**Configuration**:
```json
{
  "maxItems": 5
}
```

##### Example 2: Limit
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Hacker News to Video Content.json`  
**Workflow**: Hacker News to Video Template - AlexK1919

**Configuration**:
```json
{
  "keep": "lastItems",
  "maxItems": 50
}
```

##### Example 3: Limit
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Ultimate Scraper Workflow for n8n.json`  
**Workflow**: Selenium Ultimate Scraper Workflow

##### Example 4: Return last message in thread
**Source**: `examples/Gmail_and_Email_Automation/Compose reply draft in Gmail with OpenAI Assistant.json`  
**Workflow**: Compose reply draft in Gmail with OpenAI Assistant

**Configuration**:
```json
{
  "keep": "lastItems"
}
```

##### Example 5: Limit1
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Scrape Trustpilot Reviews with DeepSeek, Analyze Sentiment with OpenAI.json`  
**Workflow**: Scrape Trustpilot Reviews with DeepSeek, Analyze Sentiment with OpenAI

**Configuration**:
```json
{
  "maxItems": 3
}
```


---

### NoOp
**Type**: `n8n-nodes-base.noOp`  
**Description**: Pass-through node. Used to label paths or as a placeholder.  
**Auth Required**: `none`  
**Usage Count**: 59 templates

#### Usage Examples

##### Example 1: Connect to your own database
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Generate SEO Seed Keywords Using AI.json`  
**Workflow**: Generate SEO Seed Keywords Using AI

##### Example 2: Finished
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Learn Anything from HN - Get Top Resource Recommendations from Hacker News.json`  
**Workflow**: Learn Anything from HN - Get Top Resource Recommendations from Hacker News

##### Example 3: No Operation, do nothing
**Source**: `examples/Database_and_Storage/Generate SQL queries from schema only - AI-powered.json`  
**Workflow**: Generate SQL queries from schema only - AI-powered

##### Example 4: No Operation, do nothing
**Source**: `examples/Discord/Discord AI-powered bot.json`  
**Workflow**: Discord AI bot

##### Example 5: Successfully created or updated row
**Source**: `examples/Gmail_and_Email_Automation/Send a ChatGPT email reply and save responses to Google Sheets.json`  
**Workflow**: Send a ChatGPT email reply and save responses to Google Sheets


---

### Wait
**Type**: `n8n-nodes-base.wait`  
**Description**: Pauses workflow execution for a duration, until a webhook, or until a specific time.  
**Auth Required**: `none`  
**Usage Count**: 34 templates

#### Usage Examples

##### Example 1: 1sec
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI.json`  
**Workflow**: Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI

**Configuration**:
```json
{
  "amount": 1
}
```

##### Example 2: Wait2
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Hacker News to Video Content.json`  
**Workflow**: Hacker News to Video Template - AlexK1919

**Configuration**:
```json
{
  "unit": "minutes",
  "amount": 3
}
```

##### Example 3: Wait3
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Hacker News to Video Content.json`  
**Workflow**: Hacker News to Video Template - AlexK1919

**Configuration**:
```json
{
  "unit": "minutes"
}
```

##### Example 4: Wait
**Source**: `examples/OpenAI_and_LLMs/Daily Podcast Summary.json`  
**Workflow**: Daily Podcast Summary

##### Example 5: Wait1
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Hacker News to Video Content.json`  
**Workflow**: Hacker News to Video Template - AlexK1919

**Configuration**:
```json
{
  "amount": 30
}
```


---

### StopAndError
**Type**: `n8n-nodes-base.stopAndError`  
**Description**: Throws a custom error and stops the workflow. Use for validation failures.  
**Auth Required**: `none`  
**Usage Count**: 5 templates

#### Usage Examples

##### Example 1: Stop and Error
**Source**: `examples/OpenAI_and_LLMs/Fetch Dynamic Prompts from GitHub and Auto-Populate n8n Expressions in Prompt.json`  
**Workflow**: Load Prompts from Github Repo and auto populate n8n expressions

**Configuration**:
```json
{
  "errorMessage": "=Missing Prompt Variables : {{ $('Check All Prompt Vars Present').item.json.missingKeys }}\n"
}
```

##### Example 2: No Recording/Transcript available
**Source**: `examples/Other_Integrations_and_Use_Cases/Zoom AI Meeting Assistant creates mail summary, ClickUp tasks and follow-up call.json`  
**Workflow**: Zoom AI Meeting Assistant

**Configuration**:
```json
{
  "errorMessage": "={{ $json.error.cause.message }}"
}
```

##### Example 3: Stop and Error
**Source**: `examples/Telegram/Telegram chat with PDF.json`  
**Workflow**: Telegram RAG pdf

**Configuration**:
```json
{
  "errorMessage": "An error occurred"
}
```

##### Example 4: Stop and Error1
**Source**: `examples/Telegram/Telegram chat with PDF.json`  
**Workflow**: Telegram RAG pdf

**Configuration**:
```json
{
  "errorMessage": "An error occurred."
}
```

##### Example 5: Stop and Error
**Source**: `examples/devops/docker-compose-controller.json`  
**Workflow**: Start/Stop a Docker service

**Configuration**:
```json
{
  "errorMessage": "Error 404 - Route not found!"
}
```


---

### RemoveDuplicates
**Type**: `n8n-nodes-base.removeDuplicates`  
**Description**: Deduplicates items by a key field.  
**Auth Required**: `none`  
**Usage Count**: 8 templates

#### Common Operations/Modes
- `removeItemsSeenInPreviousExecutions`

#### Usage Examples

##### Example 1: Remove duplicated
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Autonomous AI crawler.json`  
**Workflow**: Autonomous AI crawler

**Configuration**:
```json
{
  "compare": "selectedFields",
  "options": {},
  "fieldsToCompare": "href"
}
```

##### Example 2: Only New Grants
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Deduplicate Scraping AI Grants for Eligibility using AI.json`  
**Workflow**: Deduplicate Scraping AI Grants for Eligibility using AI

**Configuration**:
```json
{
  "options": {},
  "operation": "removeItemsSeenInPreviousExecutions",
  "dedupeValue": "={{ $json.id }}"
}
```

##### Example 3: Mark as Seen
**Source**: `examples/Linear/Automatically create Linear issues from Gmail support request messages.json`  
**Workflow**: Automatically create Linear issues from Gmail support request messages

**Configuration**:
```json
{
  "options": {},
  "operation": "removeItemsSeenInPreviousExecutions",
  "dedupeValue": "={{ $json.id }}"
}
```

##### Example 4: Deduplicate Notifications
**Source**: `examples/Linear/Sentiment analysis tracking on support issues with Linear and Slack.json`  
**Workflow**: Sentiment analysis tracking on support issues with Linear and Slack

**Configuration**:
```json
{
  "options": {},
  "operation": "removeItemsSeenInPreviousExecutions",
  "dedupeValue": "={{ $json.fields[\"Issue ID\"] }}:{{ $json.fields['Last Modified'] }}"
}
```

##### Example 5: Remove Duplicates
**Source**: `examples/OpenAI_and_LLMs/Generate 9_16 Images from Content and Brand Guidelines.json`  
**Workflow**: Content to 9:16 Aspect Image Generator v1

**Configuration**:
```json
{
  "compare": "selectedFields",
  "options": {},
  "fieldsToCompare": "id"
}
```


---

### Sort
**Type**: `n8n-nodes-base.sort`  
**Description**: n8n node for sort operations.  
**Auth Required**: `none`  
**Usage Count**: 6 templates

#### Usage Examples

##### Example 1: Sort-workflows
**Source**: `examples/OpenAI_and_LLMs/📚 Auto-generate documentation for n8n workflows with GPT and Docsify.json`  
**Workflow**: Docsify example

**Configuration**:
```json
{
  "options": {},
  "sortFieldsUi": {
    "sortField": [
      {
        "order": "descending",
        "fieldName": "updatedAt"
      }
    ]
  }
}
```

##### Example 2: Sort By Top Weekly Creator Inserts
**Source**: `examples/OpenAI_and_LLMs/🔥📈🤖 AI Agent for n8n Creators Leaderboard - Find Popular Workflows.json`  
**Workflow**: 🔥📈🤖 AI Agent for n8n Creators Leaderboard - Find Popular Workflows

**Configuration**:
```json
{
  "options": {},
  "sortFieldsUi": {
    "sortField": [
      {
        "order": "descending",
        "fieldName": "sum_unique_weekly_inserters"
      }
    ]
  }
}
```

##### Example 3: Sort By Top Weekly Workflow Inserts
**Source**: `examples/OpenAI_and_LLMs/🔥📈🤖 AI Agent for n8n Creators Leaderboard - Find Popular Workflows.json`  
**Workflow**: 🔥📈🤖 AI Agent for n8n Creators Leaderboard - Find Popular Workflows

**Configuration**:
```json
{
  "options": {},
  "sortFieldsUi": {
    "sortField": [
      {
        "order": "descending",
        "fieldName": "unique_weekly_inserters"
      }
    ]
  }
}
```

##### Example 4: Sort By Top Weekly Creator Inserts
**Source**: `examples/OpenAI_and_LLMs/🤖🧑_💻 AI Agent for Top n8n Creators Leaderboard Reporting.json`  
**Workflow**: 🤖🧑‍💻 AI Agent for Top n8n Creators Leaderboard Reporting

**Configuration**:
```json
{
  "options": {},
  "sortFieldsUi": {
    "sortField": [
      {
        "order": "descending",
        "fieldName": "sum_unique_weekly_inserters"
      }
    ]
  }
}
```

##### Example 5: Sort By Top Weekly Workflow Inserts
**Source**: `examples/OpenAI_and_LLMs/🤖🧑_💻 AI Agent for Top n8n Creators Leaderboard Reporting.json`  
**Workflow**: 🤖🧑‍💻 AI Agent for Top n8n Creators Leaderboard Reporting

**Configuration**:
```json
{
  "options": {},
  "sortFieldsUi": {
    "sortField": [
      {
        "order": "descending",
        "fieldName": "unique_weekly_inserters"
      }
    ]
  }
}
```


---

### Summarize
**Type**: `n8n-nodes-base.summarize`  
**Description**: n8n node for summarize operations.  
**Auth Required**: `none`  
**Usage Count**: 7 templates

#### Usage Examples

##### Example 1: Summarize Data
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Create a Google Analytics Data Report with AI and sent it to E-Mail and Telegram.json`  
**Workflow**: Google Analytics: Weekly Report

**Configuration**:
```json
{
  "options": {},
  "fieldsToSummarize": {
    "values": [
      {
        "field": "Aufrufe",
        "aggregation": "sum"
      },
      {
        "field": "Nutzer",
        "aggregation": "sum"
      },
      {
        "field": "Sitzungen",
        "aggregation": "sum"
      },
      {
        "field": "Sitzungen pro Nutzer",
        "aggregation": "average"
      },
      {
        "field": "Sitzungsdauer",
        "aggregation": "average"
      },
      {
        "field": "Käufe",
        "aggregation": "sum"
      },
      {
        "field": "Revenue pro Kauf",
        "aggregation": "average"
      },
      {
        "field": "Revenue",
        "aggregation": "sum"
      },
      {
        "field": "date"
      }
    ]
  }
}
```

##### Example 2: Summarize Data1
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Create a Google Analytics Data Report with AI and sent it to E-Mail and Telegram.json`  
**Workflow**: Google Analytics: Weekly Report

**Configuration**:
```json
{
  "options": {},
  "fieldsToSummarize": {
    "values": [
      {
        "field": "Aufrufe",
        "aggregation": "sum"
      },
      {
        "field": "Nutzer",
        "aggregation": "sum"
      },
      {
        "field": "Sitzungen",
        "aggregation": "sum"
      },
      {
        "field": "Sitzungen pro Nutzer",
        "aggregation": "average"
      },
      {
        "field": "Sitzungsdauer",
        "aggregation": "average"
      },
      {
        "field": "Käufe",
        "aggregation": "sum"
      },
      {
        "field": "Revenue pro Kauf",
        "aggregation": "average"
      },
      {
        "field": "Revenue",
        "aggregation": "sum"
      },
      {
        "field": "date"
      }
    ]
  }
}
```

##### Example 3: Summarize - Concatenate Notion's blocks content
**Source**: `examples/Notion/Notion to Pinecone Vector Store Integration.json`  
**Workflow**: Prod: Notion to Vector Store - Dimension 768

**Configuration**:
```json
{
  "options": {
    "outputFormat": "separateItems"
  },
  "fieldsToSummarize": {
    "values": [
      {
        "field": "content",
        "separateBy": "\n",
        "aggregation": "concatenate"
      }
    ]
  }
}
```

##### Example 4: Summarize - Concatenate Notion's blocks content
**Source**: `examples/Notion/Store Notion_s Pages as Vector Documents into Supabase with OpenAI.json`  
**Workflow**: Store Notion's Pages as Vector Documents into Supabase with OpenAI

**Configuration**:
```json
{
  "options": {
    "outputFormat": "separateItems"
  },
  "fieldsToSummarize": {
    "values": [
      {
        "field": "content",
        "separateBy": "\n",
        "aggregation": "concatenate"
      }
    ]
  }
}
```

##### Example 5: Concatenate to single string
**Source**: `examples/Notion/Upsert huge documents in a vector store with Supabase and Notion.json`  
**Workflow**: RAG on living data

**Configuration**:
```json
{
  "options": {},
  "fieldsToSummarize": {
    "values": [
      {
        "field": "content",
        "separateBy": "\n",
        "aggregation": "concatenate"
      }
    ]
  }
}
```


---

### ItemLists
**Type**: `n8n-nodes-base.itemLists`  
**Description**: n8n node for itemLists operations.  
**Auth Required**: `none`  
**Usage Count**: 7 templates

#### Common Operations/Modes
- `concatenateItems`
- `sort`

#### Usage Examples

##### Example 1: Create single link items
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Scrape and summarize posts of a news site without RSS feed using AI and save them to a NocoDB.json`  
**Workflow**: News Extraction

**Configuration**:
```json
{
  "options": {
    "destinationFieldName": "Link"
  },
  "fieldToSplitOut": "data"
}
```

##### Example 2: Format response
**Source**: `examples/OpenAI_and_LLMs/Suggest meeting slots using AI.json`  
**Workflow**: Calendar_scheduling

**Configuration**:
```json
{
  "include": "allFieldsExcept",
  "options": {},
  "aggregate": "aggregateAllItemData",
  "operation": "concatenateItems",
  "fieldsToExclude": "sort",
  "destinationFieldName": "response"
}
```

##### Example 3: Sort
**Source**: `examples/OpenAI_and_LLMs/Suggest meeting slots using AI.json`  
**Workflow**: Calendar_scheduling

**Configuration**:
```json
{
  "options": {},
  "operation": "sort",
  "sortFieldsUi": {
    "sortField": [
      {
        "fieldName": "sort"
      }
    ]
  }
}
```

##### Example 4: Create single date items
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Scrape and summarize posts of a news site without RSS feed using AI and save them to a NocoDB.json`  
**Workflow**: News Extraction

**Configuration**:
```json
{
  "options": {
    "destinationFieldName": "Date"
  },
  "fieldToSplitOut": "data"
}
```

##### Example 5: Item Lists
**Source**: `examples/Instagram_Twitter_Social_Media/Create dynamic Twitter profile banner.json`  
**Workflow**: Create dynamic Twitter profile banner

**Configuration**:
```json
{
  "options": {},
  "fieldToSplitOut": "data"
}
```


---

### ExecuteWorkflow
**Type**: `n8n-nodes-base.executeWorkflow`  
**Description**: Calls another n8n workflow as a sub-workflow, passing items and receiving results.  
**Auth Required**: `none`  
**Usage Count**: 18 templates

#### Common Operations/Modes
- `each`

#### Usage Examples

##### Example 1: Trigger Insights
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Customer Insights with Qdrant, Python and Information Extractor.json`  
**Workflow**: Customer Insights with Qdrant, Python and Information Extractor

**Configuration**:
```json
{
  "options": {},
  "workflowId": "={{ $workflow.id }}"
}
```

##### Example 2: Execute Workflow
**Source**: `examples/Forms_and_Surveys/Email Subscription Service with n8n Forms, Airtable and AI.json`  
**Workflow**: Email Subscription Service with n8n Forms, Airtable and AI

**Configuration**:
```json
{
  "mode": "each",
  "options": {
    "waitForSubWorkflow": false
  },
  "workflowId": {
    "__rl": true,
    "mode": "id",
    "value": "={{ $workflow.id }}"
  }
}
```

##### Example 3: Execute Workflow
**Source**: `examples/Other_Integrations_and_Use_Cases/Generate & publish SEO articles with Claude AI, Webflow & image generation.json`  
**Workflow**: Copycat SEO article (public version)

**Configuration**:
```json
{
  "options": {},
  "workflowId": {
    "__rl": true,
    "mode": "list",
    "value": "7FHTcSuCIjHvvBfe",
    "cachedResultName": "Shape workflows — SEO Content evaluator"
  },
  "workflowInputs": {
    "value": {
      "article": "={{ $json.output.article }}",
      "summary": "={{ $json.output.summary }}"
    },
    "schema": [
      {
        "type": "string",
        "display": true,
        "required": false,
        "displayName": "article",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "required": false,
        "displayName": "summary",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      }
    ],
    "mappingMode": "defineBelow",
    "matchingColumns": [],
    "attemptToConvertTypes": false,
    "convertFieldsToString": true
  }
}
```

##### Example 4: Trigger Insights
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Survey Insights with Qdrant, Python and Information Extractor.json`  
**Workflow**: Survey Insights with Qdrant, Python and Information Extractor

**Configuration**:
```json
{
  "options": {},
  "workflowId": "={{ $workflow.id }}"
}
```

##### Example 5: Trigger Approval Process
**Source**: `examples/Forms_and_Surveys/Qualifying Appointment Requests with AI & n8n Forms.json`  
**Workflow**: Qualifying Appointment Requests with AI & n8n Forms

**Configuration**:
```json
{
  "mode": "each",
  "options": {
    "waitForSubWorkflow": false
  },
  "workflowId": {
    "__rl": true,
    "mode": "id",
    "value": "={{ $workflow.id }}"
  }
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

