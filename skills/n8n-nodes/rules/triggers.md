---
tags: [n8n, triggers, webhook, schedule, cron, event-driven]
category: triggers
description: All workflow trigger types — webhooks, schedules, app events, chat, forms
---

# Triggers & Entry Points

## Overview
All workflow trigger types — webhooks, schedules, app events, chat, forms.

## Nodes in This Category

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

### ScheduleTrigger
**Type**: `n8n-nodes-base.scheduleTrigger`  
**Description**: Runs a workflow on a cron schedule. Supports minute, hour, day, week, month intervals.  
**Auth Required**: `none`  
**Usage Count**: 52 templates

#### Usage Examples

##### Example 1: Schedule Trigger
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Create a Google Analytics Data Report with AI and sent it to E-Mail and Telegram.json`  
**Workflow**: Google Analytics: Weekly Report

**Configuration**:
```json
{
  "rule": {
    "interval": [
      {
        "field": "weeks",
        "triggerAtDay": [
          1
        ],
        "triggerAtHour": 7
      }
    ]
  }
}
```

##### Example 2: Everyday @ 9am
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Deduplicate Scraping AI Grants for Eligibility using AI.json`  
**Workflow**: Deduplicate Scraping AI Grants for Eligibility using AI

**Configuration**:
```json
{
  "rule": {
    "interval": [
      {
        "triggerAtHour": 8
      }
    ]
  }
}
```

##### Example 3: Everyday @ 8.30am
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Deduplicate Scraping AI Grants for Eligibility using AI.json`  
**Workflow**: Deduplicate Scraping AI Grants for Eligibility using AI

**Configuration**:
```json
{
  "rule": {
    "interval": [
      {
        "triggerAtHour": 8,
        "triggerAtMinute": 30
      }
    ]
  }
}
```

##### Example 4: Schedule Trigger each week
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Scrape and summarize posts of a news site without RSS feed using AI and save them to a NocoDB.json`  
**Workflow**: News Extraction

**Configuration**:
```json
{
  "rule": {
    "interval": [
      {
        "field": "weeks",
        "triggerAtDay": [
          3
        ],
        "triggerAtHour": 4,
        "triggerAtMinute": 32
      }
    ]
  }
}
```

##### Example 5: Schedule Trigger
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Send Google analytics data to A.I. to analyze then save results in Baserow.json`  
**Workflow**: Google analytics template

**Configuration**:
```json
{
  "rule": {
    "interval": [
      {
        "field": "weeks"
      }
    ]
  }
}
```


---

### FormTrigger
**Type**: `n8n-nodes-base.formTrigger`  
**Description**: Creates a hosted n8n form that triggers the workflow on submission.  
**Auth Required**: `none`  
**Usage Count**: 21 templates

#### Usage Examples

##### Example 1: GetTopicFromToLearn
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Learn Anything from HN - Get Top Resource Recommendations from Hacker News.json`  
**Workflow**: Learn Anything from HN - Get Top Resource Recommendations from Hacker News

**Configuration**:
```json
{
  "options": {
    "path": "learn",
    "buttonLabel": "Submit",
    "respondWithOptions": {
      "values": {
        "formSubmittedText": "We'll shortly send you an email with top recommendations."
      }
    }
  },
  "formTitle": "What do You want to learn ?",
  "formFields": {
    "values": [
      {
        "fieldLabel": "I want to learn",
        "placeholder": "Python, DevOps, Ai, or just about anything"
      },
      {
        "fieldType": "email",
        "fieldLabel": "What's your email ?",
        "placeholder": "john.doe@example.com",
        "requiredField": true
      }
    ]
  },
  "formDescription": "We'll find the best resources from HackerNews and send you an email"
}
```

##### Example 2: Step 1 of 2 - Upload CV
**Source**: `examples/Airtable/Handling Job Application Submissions with AI and n8n Forms.json`  
**Workflow**: Handling Job Application Submissions with AI and n8n Forms

**Configuration**:
```json
{
  "options": {
    "path": "job-application-step1of2",
    "ignoreBots": true,
    "buttonLabel": "Submit",
    "useWorkflowTimezone": true
  },
  "formTitle": "Step 1 of 2: Submit Your CV",
  "formFields": {
    "values": [
      {
        "fieldLabel": "Name",
        "placeholder": "Eg. Sam Smith",
        "requiredField": true
      },
      {
        "fieldType": "file",
        "fieldLabel": "File Upload",
        "multipleFiles": false,
        "requiredField": true,
        "acceptFileTypes": "pdf"
      },
      {
        "fieldType": "dropdown",
        "fieldLabel": "Acknowledgement of Terms",
        "multiselect": true,
        "fieldOptions": {
          "values": [
            {
              "option": "I agree to the terms & conditions"
            }
          ]
        },
        "requiredField": true
      }
    ]
  },
  "responseMode": "lastNode",
  "formDescription": "Thank you for your interest in applying for Acme Inc. To ensure a speedy process, please ensure you following all instructions and fill out all required inputs.\n\nThis step requires you upload your CV in a password-free PDF document. Any document that is not a CV will be rejected."
}
```

##### Example 3: n8n Form Trigger
**Source**: `examples/Forms_and_Surveys/Qualifying Appointment Requests with AI & n8n Forms.json`  
**Workflow**: Qualifying Appointment Requests with AI & n8n Forms

**Configuration**:
```json
{
  "path": "schedule_appointment",
  "options": {
    "ignoreBots": true,
    "appendAttribution": true,
    "useWorkflowTimezone": true
  },
  "formTitle": "Schedule an Appointment",
  "formFields": {
    "values": [
      {
        "fieldLabel": "Your Name",
        "placeholder": "eg. Sam Smith",
        "requiredField": true
      },
      {
        "fieldType": "email",
        "fieldLabel": "Email",
        "placeholder": "eg. sam@example.com",
        "requiredField": true
      },
      {
        "fieldType": "textarea",
        "fieldLabel": "Enquiry",
        "placeholder": "eg. I'm looking for...",
        "requiredField": true
      }
    ]
  },
  "formDescription": "Welcome to Jim's Appointment Form.\nBefore we set a date, please tell me a little about yourself and how I can help."
}
```

##### Example 4: Application Form
**Source**: `examples/Google_Drive_and_Google_Sheets/Screen Applicants With AI, notify HR and save them in a Google Sheet.json`  
**Workflow**: AI CV Screening Workflow

**Configuration**:
```json
{
  "options": {},
  "formTitle": "Application for Software Engineer Position",
  "formFields": {
    "values": [
      {
        "fieldLabel": "Full Name",
        "requiredField": true
      },
      {
        "fieldLabel": "E-mail",
        "requiredField": true
      },
      {
        "fieldLabel": "Expectation",
        "placeholder": "2000-3000$",
        "requiredField": true
      },
      {
        "fieldLabel": "Linkedin",
        "requiredField": true
      },
      {
        "fieldType": "file",
        "fieldLabel": "Your Resume/CV",
        "requiredField": true,
        "acceptFileTypes": ".pdf"
      }
    ]
  }
}
```

##### Example 5: n8n Form Trigger
**Source**: `examples/Linear/Create Linear tickets from Notion content.json`  
**Workflow**: Create Linear tickets from Notion content

**Configuration**:
```json
{
  "path": "{{UUID}}",
  "formTitle": "Import Linear issues from Notion",
  "formFields": {
    "values": [
      {
        "fieldLabel": "Notion page URL",
        "requiredField": true
      },
      {
        "fieldType": "dropdown",
        "fieldLabel": "Linear team name",
        "fieldOptions": {
          "values": [
            {
              "option": "AI"
            },
            {
              "option": "Adore"
            },
            {
              "option": "Payday"
            },
            {
              "option": "NODES"
            }
          ]
        },
        "requiredField": true
      }
    ]
  },
  "responseMode": "responseNode",
  "formDescription": "More information on Notion formatting required here: https://www.notion.so/n8n/8848dd09892341969faedd1313eea586"
}
```


---

### GmailTrigger
**Type**: `n8n-nodes-base.gmailTrigger`  
**Description**: Triggers on new Gmail messages matching a label or search filter.  
**Auth Required**: `gmailOAuth2`  
**Usage Count**: 17 templates

#### Usage Examples

##### Example 1: Gmail Trigger
**Source**: `examples/Gmail_and_Email_Automation/Analyze & Sort Suspicious Email Contents with ChatGPT.json`  
**Workflow**: Analyze & Sort Suspicious Email Contents with ChatGPT

**Credentials**: `{{CREDENTIAL_gmailOAuth2}}`

**Configuration**:
```json
{
  "simple": false,
  "filters": {},
  "options": {},
  "pollTimes": {
    "item": [
      {
        "mode": "everyMinute"
      }
    ]
  }
}
```

##### Example 2: Gmail Trigger
**Source**: `examples/Gmail_and_Email_Automation/Basic Automatic Gmail Email Labelling with OpenAI and Gmail API.json`  
**Workflow**: Basic Automatic Gmail Email Labelling with OpenAI and Gmail API

**Credentials**: `{{CREDENTIAL_gmailOAuth2}}`

**Configuration**:
```json
{
  "filters": {},
  "pollTimes": {
    "item": [
      {
        "mode": "everyX",
        "unit": "minutes",
        "value": 5
      }
    ]
  }
}
```

##### Example 3: Gmail Trigger
**Source**: `examples/Gmail_and_Email_Automation/Analyze Suspicious Email Contents with ChatGPT Vision.json`  
**Workflow**: Analyze Suspicious Email Contents with ChatGPT Vision

**Credentials**: `{{CREDENTIAL_gmailOAuth2}}`

**Configuration**:
```json
{
  "simple": false,
  "filters": {},
  "options": {},
  "pollTimes": {
    "item": [
      {
        "mode": "everyMinute"
      }
    ]
  }
}
```

##### Example 4: Gmail trigger
**Source**: `examples/Gmail_and_Email_Automation/Auto-label incoming Gmail messages with AI nodes.json`  
**Workflow**: Auto-label incoming Gmail messages with AI nodes

**Credentials**: `{{CREDENTIAL_gmailOAuth2}}`

**Configuration**:
```json
{
  "simple": false,
  "filters": {},
  "options": {},
  "pollTimes": {
    "item": [
      {
        "mode": "everyMinute"
      }
    ]
  }
}
```

##### Example 5: Get invoice
**Source**: `examples/Gmail_and_Email_Automation/Extract spending history from gmail to google sheet.json`  
**Workflow**: Extract spend details (template)

**Credentials**: `{{CREDENTIAL_gmailOAuth2}}`

**Configuration**:
```json
{
  "simple": false,
  "filters": {
    "labelIds": [
      "Label_7885838942566773656"
    ]
  },
  "options": {
    "downloadAttachments": true
  },
  "pollTimes": {
    "item": [
      {
        "mode": "everyMinute"
      }
    ]
  }
}
```


---

### TelegramTrigger
**Type**: `n8n-nodes-base.telegramTrigger`  
**Description**: Triggers on incoming Telegram messages or callback queries.  
**Auth Required**: `telegramApi`  
**Usage Count**: 20 templates

#### Usage Examples

##### Example 1: telegramInput
**Source**: `examples/Google_Drive_and_Google_Sheets/Chat with your event schedule from Google Sheets in Telegram.json`  
**Workflow**: Telegram-bot AI Da Nang

**Credentials**: `{{CREDENTIAL_telegramApi}}`

**Configuration**:
```json
{
  "updates": [
    "message"
  ],
  "additionalFields": {}
}
```

##### Example 2: Telegram Trigger
**Source**: `examples/HR_and_Recruitment/HR & IT Helpdesk Chatbot with Audio Transcription.json`  
**Workflow**: HR & IT Helpdesk Chatbot with Audio Transcription

**Credentials**: `{{CREDENTIAL_telegramApi}}`

**Configuration**:
```json
{
  "updates": [
    "message"
  ],
  "additionalFields": {}
}
```

##### Example 3: Telegram Trigger
**Source**: `examples/OpenAI_and_LLMs/Proxmox AI Agent with n8n and Generative AI Integration.json`  
**Workflow**: Proxmox AI Agent with n8n and Generative AI Integration

**Credentials**: `{{CREDENTIAL_telegramApi}}`

**Configuration**:
```json
{
  "updates": [
    "message"
  ],
  "additionalFields": {}
}
```

##### Example 4: Telegram trigger
**Source**: `examples/PDF_and_Document_Processing/Extract data from resume and create PDF with Gotenberg.json`  
**Workflow**: Extract data from resume and create PDF with Gotenberg

**Credentials**: `{{CREDENTIAL_telegramApi}}`

**Configuration**:
```json
{
  "updates": [
    "message"
  ],
  "additionalFields": {}
}
```

##### Example 5: Listen for incoming events
**Source**: `examples/Telegram/Agentic Telegram AI bot with with LangChain nodes and new tools.json`  
**Workflow**: Agentic Telegram AI bot with LangChain nodes and new tools

**Credentials**: `{{CREDENTIAL_telegramApi}}`

**Configuration**:
```json
{
  "updates": [
    "*"
  ],
  "additionalFields": {}
}
```


---

### ManualTrigger
**Type**: `n8n-nodes-base.manualTrigger`  
**Description**: n8n node for manualTrigger operations.  
**Auth Required**: `none`  
**Usage Count**: 99 templates

#### Usage Examples

##### Example 1: Execute workflow
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Autonomous AI crawler.json`  
**Workflow**: Autonomous AI crawler

##### Example 2: When clicking "Test workflow"
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build Your Own Image Search Using AI Object Detection, CDN and ElasticSearchBuild Your Own Image Search Using AI Object Detection, CDN and ElasticSearch.json`  
**Workflow**: Build Your Own Image Search Using AI Object Detection, CDN and ElasticSearchBuild Your Own Image Search Using AI Object Detection, CDN and ElasticSearch

##### Example 3: When clicking "Test workflow"
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Financial Documents Assistant using Qdrant and Mistral.ai.json`  
**Workflow**: Build a Financial Documents Assistant using Qdrant and Mistral.ai

##### Example 4: When clicking ‘Test workflow’
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI.json`  
**Workflow**: Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI

##### Example 5: When clicking ‘Test workflow’
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI.json`  
**Workflow**: Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI


---

### GoogleDriveTrigger
**Type**: `n8n-nodes-base.googleDriveTrigger`  
**Description**: n8n node for googleDriveTrigger operations.  
**Auth Required**: `googleApi`, `googleDriveOAuth2Api`  
**Usage Count**: 8 templates

#### Usage Examples

##### Example 1: Watch for new images
**Source**: `examples/Google_Drive_and_Google_Sheets/Automatic Background Removal for Images in Google Drive.json`  
**Workflow**: Remove Advanced Background from Google Drive Images

**Credentials**: `{{CREDENTIAL_googleDriveOAuth2Api}}`

**Configuration**:
```json
{
  "event": "fileCreated",
  "options": {},
  "pollTimes": {
    "item": [
      {
        "mode": "everyMinute"
      }
    ]
  },
  "triggerOn": "specificFolder",
  "folderToWatch": {
    "__rl": true,
    "mode": "list",
    "value": ""
  }
}
```

##### Example 2: Google Drive 
**Source**: `examples/Google_Drive_and_Google_Sheets/Summarize the New Documents from Google Drive and Save Summary in Google Sheet.json`  
**Workflow**: Google Doc Summarizer to Google Sheets

**Credentials**: `{{CREDENTIAL_googleApi}}`

**Configuration**:
```json
{
  "event": "fileCreated",
  "options": {},
  "pollTimes": {
    "item": [
      {
        "mode": "everyMinute"
      }
    ]
  },
  "triggerOn": "specificFolder",
  "folderToWatch": {
    "__rl": true,
    "mode": "list",
    "value": "1H8Xe2uIO0sI-QdxFsDH0Yg_w9RaPOoD_",
    "cachedResultUrl": "https://drive.google.com/drive/folders/1H8Xe2uIO0sI-QdxFsDH0Yg_w9RaPOoD_",
    "cachedResultName": "yashdata"
  },
  "authentication": "serviceAccount"
}
```

##### Example 3: Google Drive File Updated
**Source**: `examples/Google_Drive_and_Google_Sheets/RAG Chatbot for Company Documents using Google Drive and Gemini.json`  
**Workflow**: RAG Workflow For Company Documents stored in Google Drive

**Credentials**: `{{CREDENTIAL_googleDriveOAuth2Api}}`

**Configuration**:
```json
{
  "event": "fileUpdated",
  "options": {},
  "pollTimes": {
    "item": [
      {
        "mode": "everyMinute"
      }
    ]
  },
  "triggerOn": "specificFolder",
  "folderToWatch": {
    "__rl": true,
    "mode": "list",
    "value": "1evDIoHePhjw_LgVFZXSZyK1sZm2GHp9W",
    "cachedResultUrl": "https://drive.google.com/drive/folders/1evDIoHePhjw_LgVFZXSZyK1sZm2GHp9W",
    "cachedResultName": "INNOVI PRO"
  }
}
```

##### Example 4: Google Drive File Created
**Source**: `examples/Google_Drive_and_Google_Sheets/RAG Chatbot for Company Documents using Google Drive and Gemini.json`  
**Workflow**: RAG Workflow For Company Documents stored in Google Drive

**Credentials**: `{{CREDENTIAL_googleDriveOAuth2Api}}`

**Configuration**:
```json
{
  "event": "fileCreated",
  "options": {
    "fileType": "all"
  },
  "pollTimes": {
    "item": [
      {
        "mode": "everyMinute"
      }
    ]
  },
  "triggerOn": "specificFolder",
  "folderToWatch": {
    "__rl": true,
    "mode": "list",
    "value": "1evDIoHePhjw_LgVFZXSZyK1sZm2GHp9W",
    "cachedResultUrl": "https://drive.google.com/drive/folders/1evDIoHePhjw_LgVFZXSZyK1sZm2GHp9W",
    "cachedResultName": "INNOVI PRO"
  }
}
```

##### Example 5: Google Drive Trigger
**Source**: `examples/Google_Drive_and_Google_Sheets/Upload to Instagram and Tiktok from Google Drive.json`  
**Workflow**: template in store

**Credentials**: `{{CREDENTIAL_googleDriveOAuth2Api}}`

**Configuration**:
```json
{
  "event": "fileCreated",
  "options": {},
  "pollTimes": {
    "item": [
      {
        "mode": "everyMinute"
      }
    ]
  },
  "triggerOn": "specificFolder",
  "folderToWatch": {
    "__rl": true,
    "mode": "list",
    "value": "18m0i341QLQuyWuHv_FBdz8-r-QDtofYm",
    "cachedResultUrl": "https://drive.google.com/drive/folders/18m0i341QLQuyWuHv_FBdz8-r-QDtofYm",
    "cachedResultName": "Influencersde"
  }
}
```


---

### LinearTrigger
**Type**: `n8n-nodes-base.linearTrigger`  
**Description**: n8n node for linearTrigger operations.  
**Auth Required**: `linearApi`, `linearOAuth2Api`  
**Usage Count**: 12 templates

#### Usage Examples

##### Example 1: Linear Trigger
**Source**: `examples/Linear/AI-powered research assistant with Linear, Scrapeless, and Claude.json`  
**Workflow**: Build an AI-Powered Research Assistant with Linear + Scrapeless + Claude

**Credentials**: `{{CREDENTIAL_linearApi}}`

**Configuration**:
```json
{
  "teamId": "{{UUID}}",
  "resources": [
    "issue",
    "comment",
    "reaction"
  ]
}
```

##### Example 2: Linear Trigger
**Source**: `examples/Linear/Classify new bugs in Linear with OpenAI's GPT-4 and move them to the right team.json`  
**Workflow**: Classify new bugs in Linear with OpenAI's GPT-4 and move them to the right team

**Credentials**: `{{CREDENTIAL_linearOAuth2Api}}`

**Configuration**:
```json
{
  "teamId": "{{UUID}}",
  "resources": [
    "issue"
  ],
  "authentication": "oAuth2"
}
```

##### Example 3: 🔔 Linear Trigger
**Source**: `examples/Linear/Automatic issue routing in Linear with GPT-4-mini classification.json`  
**Workflow**: Linear Bug Auto-Routing

**Credentials**: `{{CREDENTIAL_linearApi}}`

**Configuration**:
```json
{
  "teamId": "YOUR_LINEAR_TEAM_ID",
  "resources": [
    "issue"
  ]
}
```

##### Example 4: Core
**Source**: `examples/Linear/Linear to Productboard feature sync.json`  
**Workflow**: Linear to Productboard

**Credentials**: `{{CREDENTIAL_linearApi}}`

**Configuration**:
```json
{
  "teamId": "{{UUID}}",
  "resources": [
    "project",
    "issue"
  ]
}
```

##### Example 5: NHI
**Source**: `examples/Linear/Linear to Productboard feature sync.json`  
**Workflow**: Linear to Productboard

**Credentials**: `{{CREDENTIAL_linearApi}}`

**Configuration**:
```json
{
  "teamId": "{{UUID}}",
  "resources": [
    "project",
    "issue"
  ]
}
```


---

### NotionTrigger
**Type**: `n8n-nodes-base.notionTrigger`  
**Description**: n8n node for notionTrigger operations.  
**Auth Required**: `notionApi`  
**Usage Count**: 3 templates

#### Usage Examples

##### Example 1: Notion - Page Added Trigger
**Source**: `examples/Notion/Notion to Pinecone Vector Store Integration.json`  
**Workflow**: Prod: Notion to Vector Store - Dimension 768

**Credentials**: `{{CREDENTIAL_notionApi}}`

**Configuration**:
```json
{
  "simple": false,
  "pollTimes": {
    "item": [
      {
        "mode": "everyMinute"
      }
    ]
  },
  "databaseId": {
    "__rl": true,
    "mode": "list",
    "value": "{{UUID}}",
    "cachedResultUrl": "https://www.notion.so/17b11930c10f8000a545ece7cade03f9",
    "cachedResultName": "Embeddings"
  }
}
```

##### Example 2: Notion - Page Added Trigger
**Source**: `examples/Notion/Store Notion_s Pages as Vector Documents into Supabase with OpenAI.json`  
**Workflow**: Store Notion's Pages as Vector Documents into Supabase with OpenAI

**Configuration**:
```json
{
  "simple": false,
  "pollTimes": {
    "item": [
      {
        "mode": "everyMinute"
      }
    ]
  },
  "databaseId": {
    "__rl": true,
    "mode": "list",
    "value": "",
    "cachedResultUrl": "",
    "cachedResultName": ""
  }
}
```

##### Example 3: Notion Trigger
**Source**: `examples/Notion/Upsert huge documents in a vector store with Supabase and Notion.json`  
**Workflow**: RAG on living data

**Credentials**: `{{CREDENTIAL_notionApi}}`

**Configuration**:
```json
{
  "event": "pagedUpdatedInDatabase",
  "pollTimes": {
    "item": [
      {
        "mode": "everyMinute"
      }
    ]
  },
  "databaseId": {
    "__rl": true,
    "mode": "list",
    "value": "{{UUID}}",
    "cachedResultUrl": "https://www.notion.so/ec6dc7b49ce047f78025ef09295999fd",
    "cachedResultName": "Knowledge Base"
  }
}
```


---

### MicrosoftOutlookTrigger
**Type**: `n8n-nodes-base.microsoftOutlookTrigger`  
**Description**: n8n node for microsoftOutlookTrigger operations.  
**Auth Required**: `microsoftOutlookOAuth2Api`  
**Usage Count**: 2 templates

#### Usage Examples

##### Example 1: Microsoft Outlook Trigger
**Source**: `examples/Gmail_and_Email_Automation/Analyze & Sort Suspicious Email Contents with ChatGPT.json`  
**Workflow**: Analyze & Sort Suspicious Email Contents with ChatGPT

**Credentials**: `{{CREDENTIAL_microsoftOutlookOAuth2Api}}`

**Configuration**:
```json
{
  "fields": [
    "body",
    "toRecipients",
    "subject",
    "bodyPreview"
  ],
  "output": "fields",
  "filters": {},
  "options": {},
  "pollTimes": {
    "item": [
      {
        "mode": "everyMinute"
      }
    ]
  }
}
```

##### Example 2: Microsoft Outlook Trigger
**Source**: `examples/Gmail_and_Email_Automation/Analyze Suspicious Email Contents with ChatGPT Vision.json`  
**Workflow**: Analyze Suspicious Email Contents with ChatGPT Vision

**Credentials**: `{{CREDENTIAL_microsoftOutlookOAuth2Api}}`

**Configuration**:
```json
{
  "fields": [
    "body",
    "toRecipients",
    "subject",
    "bodyPreview"
  ],
  "output": "fields",
  "filters": {},
  "options": {},
  "pollTimes": {
    "item": [
      {
        "mode": "everyMinute"
      }
    ]
  }
}
```


---

### WhatsAppTrigger
**Type**: `n8n-nodes-base.whatsAppTrigger`  
**Description**: n8n node for whatsAppTrigger operations.  
**Auth Required**: `whatsAppTriggerApi`  
**Usage Count**: 2 templates

#### Usage Examples

##### Example 1: WhatsApp Trigger
**Source**: `examples/WhatsApp/Building Your First WhatsApp Chatbot.json`  
**Workflow**: Building Your First WhatsApp Chatbot

**Credentials**: `{{CREDENTIAL_whatsAppTriggerApi}}`

**Configuration**:
```json
{
  "updates": [
    "messages"
  ]
}
```

##### Example 2: WhatsApp Trigger
**Source**: `examples/WhatsApp/Respond to WhatsApp Messages with AI Like a Pro!.json`  
**Workflow**: Respond to WhatsApp Messages with AI Like a Pro!

**Credentials**: `{{CREDENTIAL_whatsAppTriggerApi}}`

**Configuration**:
```json
{
  "updates": [
    "messages"
  ]
}
```


---

### TypeformTrigger
**Type**: `n8n-nodes-base.typeformTrigger`  
**Description**: n8n node for typeformTrigger operations.  
**Auth Required**: `typeformApi`  
**Usage Count**: 3 templates

#### Usage Examples

##### Example 1: Typeform Trigger
**Source**: `examples/Notion/Add positive feedback messages to a table in Notion.json`  
**Workflow**: Add positive feedback messages to a table in Notion

**Credentials**: `{{CREDENTIAL_typeformApi}}`

**Configuration**:
```json
{
  "formId": "fBYjtY5e"
}
```

##### Example 2: Typeform Trigger
**Source**: `examples/Other_Integrations_and_Use_Cases/Analyze feedback and send a message on Mattermost.json`  
**Workflow**: Analyze the sentiment of feedback and send a message on Mattermost

**Credentials**: `{{CREDENTIAL_typeformApi}}`

**Configuration**:
```json
{
  "formId": ""
}
```

##### Example 3: Typeform Trigger
**Source**: `examples/Other_Integrations_and_Use_Cases/Analyze feedback using AWS Comprehend and send it to a Mattermost channel.json`  
**Workflow**: Analyze feedback using AWS Comprehend and send it to a Mattermost channel

**Credentials**: `{{CREDENTIAL_typeformApi}}`

**Configuration**:
```json
{
  "formId": "DuJHEGW5"
}
```


---

### TwilioTrigger
**Type**: `n8n-nodes-base.twilioTrigger`  
**Description**: n8n node for twilioTrigger operations.  
**Auth Required**: `twilioApi`  
**Usage Count**: 2 templates

#### Usage Examples

##### Example 1: Twilio Trigger
**Source**: `examples/Other_Integrations_and_Use_Cases/Enhance Customer Chat by Buffering Messages with Twilio and Redis.json`  
**Workflow**: Enhance Customer Chat by Buffering Messages with Twilio and Redis

**Credentials**: `{{CREDENTIAL_twilioApi}}`

**Configuration**:
```json
{
  "updates": [
    "com.twilio.messaging.inbound-message.received"
  ]
}
```

##### Example 2: Twilio Trigger
**Source**: `examples/Other_Integrations_and_Use_Cases/Handling Appointment Leads and Follow-up With Twilio, Cal.com and AI.json`  
**Workflow**: Handling Appointment Leads and Follow-up With Twilio, Cal.com and AI

**Credentials**: `{{CREDENTIAL_twilioApi}}`

**Configuration**:
```json
{
  "updates": [
    "com.twilio.messaging.inbound-message.received"
  ]
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

### RssFeedReadTrigger
**Type**: `n8n-nodes-base.rssFeedReadTrigger`  
**Description**: n8n node for rssFeedReadTrigger operations.  
**Auth Required**: `none`  
**Usage Count**: 2 templates

#### Usage Examples

##### Example 1: YouTube Video Trigger
**Source**: `examples/Discord/Share YouTube Videos with AI Summaries on Discord.json`  
**Workflow**: YouTube Videos with AI Summaries on Discord

**Configuration**:
```json
{
  "feedUrl": "https://www.youtube.com/feeds/videos.xml?channel_id=UC08Fah8EIryeOZRkjBRohcQ",
  "pollTimes": {
    "item": [
      {
        "mode": "everyMinute"
      }
    ]
  }
}
```

##### Example 2: RSS Feed Trigger
**Source**: `examples/WordPress/Auto-Tag Blog Posts in WordPress with AI.json`  
**Workflow**: Auto-Tag Blog Posts in WordPress with AI

**Configuration**:
```json
{
  "pollTimes": {
    "item": [
      {
        "mode": "everyMinute"
      }
    ]
  }
}
```


---

### GoogleSheetsTrigger
**Type**: `n8n-nodes-base.googleSheetsTrigger`  
**Description**: n8n node for googleSheetsTrigger operations.  
**Auth Required**: `googleSheetsTriggerOAuth2Api`  
**Usage Count**: 3 templates

#### Usage Examples

##### Example 1: Check for new entries
**Source**: `examples/Google_Drive_and_Google_Sheets/Qualify new leads in Google Sheets via OpenAI_s GPT-4.json`  
**Workflow**: Qualify new leads in Google Sheets via OpenAI's GPT-4

**Credentials**: `{{CREDENTIAL_googleSheetsTriggerOAuth2Api}}`

**Configuration**:
```json
{
  "event": "rowAdded",
  "options": {},
  "pollTimes": {
    "item": [
      {
        "mode": "everyMinute"
      }
    ]
  },
  "sheetName": {
    "__rl": true,
    "mode": "list",
    "value": 72739218,
    "cachedResultUrl": "https://docs.google.com/spreadsheets/d/1jk8ZbfOMObvHGGImc0sBJTZB_hracO4jRqfbryMgzEs/edit#gid=72739218",
    "cachedResultName": "Form Responses 1"
  },
  "documentId": {
    "__rl": true,
    "mode": "list",
    "value": "1jk8ZbfOMObvHGGImc0sBJTZB_hracO4jRqfbryMgzEs",
    "cachedResultUrl": "https://docs.google.com/spreadsheets/d/1jk8ZbfOMObvHGGImc0sBJTZB_hracO4jRqfbryMgzEs/edit?usp=drivesdk",
    "cachedResultName": "Join Community (Responses)"
  }
}
```

##### Example 2: Google Sheets Trigger
**Source**: `examples/Instagram_Twitter_Social_Media/Social Media Analysis and Automated Email Generation.json`  
**Workflow**: Social Media Analysis and Automated Email Generation

**Credentials**: `{{CREDENTIAL_googleSheetsTriggerOAuth2Api}}`

**Configuration**:
```json
{
  "options": {
    "dataLocationOnSheet": {
      "values": {
        "rangeDefinition": "specifyRange"
      }
    }
  },
  "pollTimes": {
    "item": [
      {
        "mode": "everyMinute"
      }
    ]
  },
  "sheetName": {
    "__rl": true,
    "mode": "list",
    "value": "gid=0",
    "cachedResultUrl": "https://docs.google.com/spreadsheets/d/1IcvbbG_WScVNyutXhzqyE9NxdxNbY90Dd63R8Y1UrAw/edit#gid=0",
    "cachedResultName": "Sheet1"
  },
  "documentId": {
    "__rl": true,
    "mode": "list",
    "value": "1IcvbbG_WScVNyutXhzqyE9NxdxNbY90Dd63R8Y1UrAw",
    "cachedResultUrl": "https://docs.google.com/spreadsheets/d/1IcvbbG_WScVNyutXhzqyE9NxdxNbY90Dd63R8Y1UrAw/edit?usp=drivesdk",
    "cachedResultName": "Analyze social media of a lead"
  }
}
```

##### Example 3: Google Sheets Trigger
**Source**: `examples/Other_Integrations_and_Use_Cases/Optimize & Update Printify Title and Description Workflow.json`  
**Workflow**: Printify Automation - Update Title and Description - AlexK1919

**Credentials**: `{{CREDENTIAL_googleSheetsTriggerOAuth2Api}}`

**Configuration**:
```json
{
  "event": "rowUpdate",
  "options": {
    "columnsToWatch": [
      "upload"
    ]
  },
  "pollTimes": {
    "item": [
      {
        "mode": "everyMinute"
      }
    ]
  },
  "sheetName": {
    "__rl": true,
    "mode": "list",
    "value": "gid=0",
    "cachedResultUrl": "https://docs.google.com/spreadsheets/d/1A6Phr6QwnMltm1_O6dVGAzmSPlOwuwp7RbCiLSvd9l0/edit#gid=0",
    "cachedResultName": "Sheet1"
  },
  "documentId": {
    "__rl": true,
    "mode": "list",
    "value": "1A6Phr6QwnMltm1_O6dVGAzmSPlOwuwp7RbCiLSvd9l0",
    "cachedResultUrl": "https://docs.google.com/spreadsheets/d/1A6Phr6QwnMltm1_O6dVGAzmSPlOwuwp7RbCiLSvd9l0/edit?usp=drivesdk",
    "cachedResultName": "Printify - AlexK1919"
  }
}
```


---

### LocalFileTrigger
**Type**: `n8n-nodes-base.localFileTrigger`  
**Description**: n8n node for localFileTrigger operations.  
**Auth Required**: `none`  
**Usage Count**: 4 templates

#### Usage Examples

##### Example 1: Local File Trigger
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Financial Documents Assistant using Qdrant and Mistral.ai.json`  
**Workflow**: Build a Financial Documents Assistant using Qdrant and Mistral.ai

**Configuration**:
```json
{
  "path": "/home/node/host_mount/local_file_search",
  "events": [
    "add",
    "change",
    "unlink"
  ],
  "options": {
    "awaitWriteFinish": true
  },
  "triggerOn": "folder"
}
```

##### Example 2: Watch For Bank Statements
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Reconcile Rent Payments with Local Excel Spreadsheet and OpenAI.json`  
**Workflow**: Reconcile Rent Payments with Local Excel Spreadsheet and OpenAI

**Configuration**:
```json
{
  "path": "/home/node/host_mount/reconciliation_project",
  "events": [
    "add"
  ],
  "options": {
    "ignored": "!**/*.csv"
  },
  "triggerOn": "folder"
}
```

##### Example 3: Local File Trigger
**Source**: `examples/OpenAI_and_LLMs/Organise Your Local File Directories With AI.json`  
**Workflow**: Organise Your Local File Directories With AI

**Configuration**:
```json
{
  "path": "/home/node/host_mount/shared_drive",
  "events": [
    "add"
  ],
  "options": {
    "awaitWriteFinish": true
  },
  "triggerOn": "folder"
}
```

##### Example 4: Local File Trigger
**Source**: `examples/PDF_and_Document_Processing/Breakdown Documents into Study Notes using Templating MistralAI and Qdrant.json`  
**Workflow**: Breakdown Documents into Study Notes using Templating MistralAI and Qdrant

**Configuration**:
```json
{
  "path": "/home/node/storynotes/context",
  "events": [
    "add"
  ],
  "options": {
    "usePolling": true,
    "followSymlinks": true
  },
  "triggerOn": "folder"
}
```


---

### StravaTrigger
**Type**: `n8n-nodes-base.stravaTrigger`  
**Description**: n8n node for stravaTrigger operations.  
**Auth Required**: `stravaOAuth2Api`  
**Usage Count**: 1 templates

#### Usage Examples

##### Example 1: Strava Trigger
**Source**: `examples/OpenAI_and_LLMs/AI Fitness Coach Strava Data Analysis and Personalized Training Insights.json`  
**Workflow**: AI Fitness Coach Strava Data Analysis and Personalized Training Insights

**Credentials**: `{{CREDENTIAL_stravaOAuth2Api}}`

**Configuration**:
```json
{
  "event": "update",
  "object": "activity",
  "options": {}
}
```


---

### LemlistTrigger
**Type**: `n8n-nodes-base.lemlistTrigger`  
**Description**: n8n node for lemlistTrigger operations.  
**Auth Required**: `none`  
**Usage Count**: 1 templates

#### Usage Examples

##### Example 1: Lemlist Trigger - On new reply
**Source**: `examples/Gmail_and_Email_Automation/Classify lemlist replies using OpenAI and automate reply handling.json`  
**Workflow**: Classify lemlist replies using OpenAI and automate reply handling

**Configuration**:
```json
{
  "event": "emailsReplied",
  "options": {
    "isFirst": true
  }
}
```


---

### PipedriveTrigger
**Type**: `n8n-nodes-base.pipedriveTrigger`  
**Description**: n8n node for pipedriveTrigger operations.  
**Auth Required**: `pipedriveApi`  
**Usage Count**: 1 templates

#### Usage Examples

##### Example 1: Pipedrive Trigger - An Organization is created
**Source**: `examples/Slack/Enrich Pipedrive_s Organization Data with OpenAI GPT-4o & Notify it in Slack.json`  
**Workflow**: piepdrive-test

**Credentials**: `{{CREDENTIAL_pipedriveApi}}`

**Configuration**:
```json
{
  "action": "added",
  "object": "organization"
}
```


---

### ErrorTrigger
**Type**: `n8n-nodes-base.errorTrigger`  
**Description**: Triggers when another workflow throws an error. Use for centralised error handling.  
**Auth Required**: `none`  
**Usage Count**: 1 templates

#### Usage Examples

##### Example 1: Error Trigger
**Source**: `examples/Google_Drive_and_Google_Sheets/Upload to Instagram and Tiktok from Google Drive.json`  
**Workflow**: template in store


---

### ExecuteWorkflowTrigger
**Type**: `n8n-nodes-base.executeWorkflowTrigger`  
**Description**: Entry point when this workflow is called as a sub-workflow via executeWorkflow node.  
**Auth Required**: `none`  
**Usage Count**: 40 templates

#### Usage Examples

##### Example 1: Execute Workflow Trigger
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Automated Hugging Face Paper Summary Fetching & Categorization Workflow.json`  
**Workflow**: [3/3] Anomaly detection tool (crops dataset)

##### Example 2: Workflow Input Trigger
**Source**: `examples/Google_Drive_and_Google_Sheets/Simple Expense Tracker with n8n Chat, AI Agent and Google Sheets.json`  
**Workflow**: AI agent: expense tracker in Google Sheets and n8n chat

**Configuration**:
```json
{
  "workflowInputs": {
    "values": [
      {
        "name": "input1"
      }
    ]
  }
}
```

##### Example 3: When Executed by Another Workflow
**Source**: `examples/OpenAI_and_LLMs/🔥📈🤖 AI Agent for n8n Creators Leaderboard - Find Popular Workflows.json`  
**Workflow**: 🔥📈🤖 AI Agent for n8n Creators Leaderboard - Find Popular Workflows

**Configuration**:
```json
{
  "inputSource": "jsonExample",
  "jsonExample": "{\n \"query\": \n {\n \"username\": \n \"joe\"\n }\n}"
}
```

##### Example 4: Execute Workflow Trigger
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI.json`  
**Workflow**: Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI

##### Example 5: Execute Workflow Trigger
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI.json`  
**Workflow**: Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI


---

### ChatTrigger
**Type**: `@n8n/n8n-nodes-langchain.chatTrigger`  
**Description**: Exposes an n8n chat UI endpoint. Used for production chatbot deployments.  
**Auth Required**: `none`  
**Usage Count**: 53 templates

#### Common Operations/Modes
- `webhook`

#### Usage Examples

##### Example 1: Chat Trigger
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Financial Documents Assistant using Qdrant and Mistral.ai.json`  
**Workflow**: Build a Financial Documents Assistant using Qdrant and Mistral.ai

##### Example 2: When chat message received
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI.json`  
**Workflow**: Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI

**Configuration**:
```json
{
  "public": true,
  "options": {
    "loadPreviousSession": "memory"
  },
  "initialMessages": ""
}
```

##### Example 3: When chat message received
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI.json`  
**Workflow**: Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 4: When chat message received
**Source**: `examples/Database_and_Storage/MongoDB AI Agent - Intelligent Movie Recommendations.json`  
**Workflow**: MongoDB Agent

**Configuration**:
```json
{
  "mode": "webhook",
  "public": true,
  "options": {
    "allowedOrigins": "*"
  }
}
```

##### Example 5: When chat message received
**Source**: `examples/Notion/Upsert huge documents in a vector store with Supabase and Notion.json`  
**Workflow**: RAG on living data

**Configuration**:
```json
{
  "public": true,
  "options": {}
}
```


---

### ManualChatTrigger
**Type**: `@n8n/n8n-nodes-langchain.manualChatTrigger`  
**Description**: Triggers workflow from the n8n built-in chat interface. Use for testing AI agents.  
**Auth Required**: `none`  
**Usage Count**: 6 templates

#### Usage Examples

##### Example 1: On new manual Chat Message
**Source**: `examples/OpenAI_and_LLMs/AI Agent with Ollama for current weather and wiki.json`  
**Workflow**: AI Agent with Ollama for current weather and wiki

##### Example 2: On new manual Chat Message
**Source**: `examples/OpenAI_and_LLMs/AI Crew to Automate Fundamental Stock Analysis - Q&A Workflow.json`  
**Workflow**: Stock Q&A Workflow

##### Example 3: On new manual Chat Message
**Source**: `examples/OpenAI_and_LLMs/AI agent that can scrape webpages.json`  
**Workflow**: Agent with custom HTTP Request

##### Example 4: On new manual Chat Message
**Source**: `examples/OpenAI_and_LLMs/AI chat with any data source (using the n8n workflow tool).json`  
**Workflow**: AI chat with any data source (using the n8n workflow tool)

##### Example 5: On new manual Chat Message
**Source**: `examples/OpenAI_and_LLMs/AI chatbot that can search the web.json`  
**Workflow**: AI chatbot that can search the web


---

### Cron
**Type**: `n8n-nodes-base.cron`  
**Description**: n8n node for cron operations.  
**Auth Required**: `none`  
**Usage Count**: 2 templates

#### Usage Examples

##### Example 1: Cron
**Source**: `examples/PDF_and_Document_Processing/ETL pipeline for text processing.json`  
**Workflow**: ETL pipeline

**Configuration**:
```json
{
  "triggerTimes": {
    "item": [
      {
        "hour": 6
      }
    ]
  }
}
```

##### Example 2: Cron
**Source**: `examples/Telegram/Send a random recipe once a day to Telegram.json`  
**Workflow**: Send a random recipe once a day to Telegram

**Configuration**:
```json
{
  "triggerTimes": {
    "item": [
      {}
    ]
  }
}
```


---

### Interval
**Type**: `n8n-nodes-base.interval`  
**Description**: n8n node for interval operations.  
**Auth Required**: `none`  
**Usage Count**: 1 templates

#### Usage Examples

##### Example 1: Every 30 Minutes
**Source**: `examples/Other_Integrations_and_Use_Cases/Automate testimonials in Strapi with n8n.json`  
**Workflow**: Automate testimonials in Strapi with n8n

**Configuration**:
```json
{
  "unit": "minutes",
  "interval": 30
}
```

