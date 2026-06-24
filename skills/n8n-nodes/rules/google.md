---
tags: [n8n, google, sheets, drive, docs, calendar, analytics, google-workspace]
category: google
description: Google Sheets, Drive, Docs, Calendar, and Analytics integrations
---

# Google Workspace

## Overview
Google Sheets, Drive, Docs, Calendar, and Analytics integrations.

## Nodes in This Category

---

### GoogleSheets
**Type**: `n8n-nodes-base.googleSheets`  
**Description**: Read, write, append, update and delete rows in Google Sheets.  
**Auth Required**: `googleApi`, `googleSheetsOAuth2Api`  
**Usage Count**: 90 templates

#### Common Operations/Modes
- `append`
- `appendOrUpdate`
- `create`
- `spreadsheet`
- `update`

#### Usage Examples

##### Example 1: Export To Sheets
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Customer Insights with Qdrant, Python and Information Extractor.json`  
**Workflow**: Customer Insights with Qdrant, Python and Information Extractor

**Credentials**: `{{CREDENTIAL_googleSheetsOAuth2Api}}`

**Configuration**:
```json
{
  "columns": {
    "value": {},
    "schema": [
      {
        "type": "string",
        "display": true,
        "removed": false,
        "required": false,
        "displayName": "CompanyID",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "removed": false,
        "required": false,
        "displayName": "From",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "removed": false,
        "required": false,
        "displayName": "To",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "removed": false,
        "required": false,
        "displayName": "Insight",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "removed": false,
        "required": false,
        "displayName": "Sentiment",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "removed": false,
        "required": false,
        "displayName": "Suggested Improvements",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "removed": false,
        "required": false,
        "displayName": "Number of Responses",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "removed": false,
        "required": false,
        "displayName": "Raw Responses",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      }
    ],
    "mappingMode": "autoMapInputData",
    "matchingColumns": []
  },
  "options": {},
  "operation": "append",
  "sheetName": {
    "__rl": true,
    "mode": "nam
```

##### Example 2: Get rows
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Scrape Trustpilot Reviews with DeepSeek, Analyze Sentiment with OpenAI.json`  
**Workflow**: Scrape Trustpilot Reviews with DeepSeek, Analyze Sentiment with OpenAI

**Credentials**: `{{CREDENTIAL_googleSheetsOAuth2Api}}`

**Configuration**:
```json
{
  "options": {},
  "filtersUI": {
    "values": [
      {
        "lookupValue": "={{ $('Split Out').item.json.recensioni.replace('/reviews/','') }}",
        "lookupColumn": "Id"
      }
    ]
  },
  "sheetName": {
    "__rl": true,
    "mode": "list",
    "value": "gid=0",
    "cachedResultUrl": "",
    "cachedResultName": "Foglio1"
  },
  "documentId": {
    "__rl": true,
    "mode": "list",
    "value": "1QZhQqg79-HVBQh8Y2ihMq67UIYIRrJFKLQalcFvtDaY",
    "cachedResultUrl": "",
    "cachedResultName": "Trustpilot Review"
  }
}
```

##### Example 3: Get Google Sheets
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Scrape Trustpilot Reviews with DeepSeek, Analyze Sentiment with OpenAI.json`  
**Workflow**: Scrape Trustpilot Reviews with DeepSeek, Analyze Sentiment with OpenAI

**Credentials**: `{{CREDENTIAL_googleSheetsOAuth2Api}}`

**Configuration**:
```json
{
  "columns": {
    "value": {
      "Id": "={{ $('Split Out').item.json.recensioni.replace('/reviews/','') }}"
    },
    "schema": [
      {
        "type": "string",
        "display": true,
        "removed": false,
        "required": false,
        "displayName": "Id",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "required": false,
        "displayName": "Data",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "required": false,
        "displayName": "Nome",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "required": false,
        "displayName": "Titolo",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "required": false,
        "displayName": "Testo",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "required": false,
        "displayName": "Località",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "required": false,
        "displayName": "N. Recensioni",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "required": false,
        "displayName": "URL",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "required": false,
        "displayName": "Valutazione",
        "defaultMatch": false,
        "canBeUsedToMatch": true
      },
      {
        "type": "string",
        "display": true,
        "removed": false,
        "required": fal
```

##### Example 4: Get Survey Results
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Survey Insights with Qdrant, Python and Information Extractor.json`  
**Workflow**: Survey Insights with Qdrant, Python and Information Extractor

**Credentials**: `{{CREDENTIAL_googleSheetsOAuth2Api}}`

**Configuration**:
```json
{
  "options": {},
  "sheetName": {
    "__rl": true,
    "mode": "list",
    "value": "gid=0",
    "cachedResultUrl": "https://docs.google.com/spreadsheets/d/1-168Vm-1kCeHkqGLAs6odha4DhPE93njfHlYIviKE50/edit#gid=0",
    "cachedResultName": "Sheet1"
  },
  "documentId": {
    "__rl": true,
    "mode": "list",
    "value": "1-168Vm-1kCeHkqGLAs6odha4DhPE93njfHlYIviKE50",
    "cachedResultUrl": "https://docs.google.com/spreadsheets/d/1-168Vm-1kCeHkqGLAs6odha4DhPE93njfHlYIviKE50/edit?usp=drivesdk",
    "cachedResultName": "Remote Working Survey Responses"
  }
}
```

##### Example 5: Create Insights Sheet
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Survey Insights with Qdrant, Python and Information Extractor.json`  
**Workflow**: Survey Insights with Qdrant, Python and Information Extractor

**Credentials**: `{{CREDENTIAL_googleSheetsOAuth2Api}}`

**Configuration**:
```json
{
  "title": "={{ $('Set Variables').first().json.insightsSheetName }}",
  "options": {},
  "operation": "create",
  "documentId": {
    "__rl": true,
    "mode": "id",
    "value": "={{ $('Execute Workflow Trigger').first().json.sheetID }}"
  }
}
```


---

### GoogleDrive
**Type**: `n8n-nodes-base.googleDrive`  
**Description**: Upload, download, list, copy, and manage files in Google Drive.  
**Auth Required**: `googleApi`, `googleDriveOAuth2Api`  
**Usage Count**: 55 templates

#### Common Operations/Modes
- `createFromText`
- `download`
- `fileFolder`
- `update`

#### Usage Examples

##### Example 1: Google Drive
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Hacker News to Video Content.json`  
**Workflow**: Hacker News to Video Template - AlexK1919

**Credentials**: `{{CREDENTIAL_googleDriveOAuth2Api}}`

**Configuration**:
```json
{
  "fileId": {
    "__rl": true,
    "mode": "list",
    "value": ""
  },
  "options": {},
  "operation": "update"
}
```

##### Example 2: Base Image
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Visual Regression Testing with Apify and AI Vision Model.json`  
**Workflow**: Visual Regression Testing with Apify and AI Vision Model

**Credentials**: `{{CREDENTIAL_googleDriveOAuth2Api}}`

**Configuration**:
```json
{
  "fileId": {
    "__rl": true,
    "mode": "id",
    "value": "={{ $json.base }}"
  },
  "options": {
    "binaryPropertyName": "data_1"
  },
  "operation": "download"
}
```

##### Example 3: Upload to Drive
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Visual Regression Testing with Apify and AI Vision Model.json`  
**Workflow**: Visual Regression Testing with Apify and AI Vision Model

**Credentials**: `{{CREDENTIAL_googleDriveOAuth2Api}}`

**Configuration**:
```json
{
  "name": "={{ $('Merge').item.json.url.urlEncode() }}",
  "driveId": {
    "__rl": true,
    "mode": "list",
    "value": "My Drive"
  },
  "options": {
    "simplifyOutput": true
  },
  "folderId": {
    "__rl": true,
    "mode": "list",
    "value": "1lAFxJPWcA_sOcjr3UUKKfFfoTwd4Stkh",
    "cachedResultUrl": "https://drive.google.com/drive/folders/1lAFxJPWcA_sOcjr3UUKKfFfoTwd4Stkh",
    "cachedResultName": "base_images"
  }
}
```

##### Example 4: Get folder
**Source**: `examples/Gmail_and_Email_Automation/Effortless Email Management with AI-Powered Summarization & Review.json`  
**Workflow**: Effortless Email Management with AI

**Credentials**: `{{CREDENTIAL_googleDriveOAuth2Api}}`

**Configuration**:
```json
{
  "filter": {
    "driveId": {
      "__rl": true,
      "mode": "list",
      "value": "My Drive",
      "cachedResultUrl": "https://drive.google.com/drive/my-drive",
      "cachedResultName": "My Drive"
    },
    "folderId": {
      "__rl": true,
      "mode": "id",
      "value": "=test-whatsapp"
    }
  },
  "options": {},
  "resource": "fileFolder"
}
```

##### Example 5: Upload file to folder
**Source**: `examples/Gmail_and_Email_Automation/Send specific PDF attachments from Gmail to Google Drive using OpenAI.json`  
**Workflow**: Send specific PDF attachments from Gmail to Google Drive using OpenAI

**Credentials**: `{{CREDENTIAL_googleDriveOAuth2Api}}`

**Configuration**:
```json
{
  "name": "={{ $binary.data.fileName }}",
  "options": {},
  "parents": [
    "={{ $('Configure').first().json[\"Google Drive folder to upload matched PDFs\"].split(\"/\").at(-1) }}"
  ],
  "binaryData": true
}
```


---

### GoogleDocs
**Type**: `n8n-nodes-base.googleDocs`  
**Description**: Create, read and update Google Docs documents.  
**Auth Required**: `googleApi`, `googleDocsOAuth2Api`  
**Usage Count**: 8 templates

#### Common Operations/Modes
- `get`
- `update`

#### Usage Examples

##### Example 1: Google Docs
**Source**: `examples/Google_Drive_and_Google_Sheets/Summarize the New Documents from Google Drive and Save Summary in Google Sheet.json`  
**Workflow**: Google Doc Summarizer to Google Sheets

**Credentials**: `{{CREDENTIAL_googleApi}}`

**Configuration**:
```json
{
  "operation": "get",
  "documentURL": "={{ $json.id }}",
  "authentication": "serviceAccount"
}
```

##### Example 2: Save Report to Google Docs
**Source**: `examples/OpenAI_and_LLMs/AI-Powered RAG Workflow For Stock Earnings Report Analysis.json`  
**Workflow**: RAG Workflow For Stock Earnings Report Analysis

**Credentials**: `{{CREDENTIAL_googleDocsOAuth2Api}}`

**Configuration**:
```json
{
  "actionsUi": {
    "actionFields": [
      {
        "text": "={{ $json.output }}",
        "action": "insert"
      }
    ]
  },
  "operation": "update",
  "documentURL": "1aOUl-mnCaI4__tULmBZSvWlOQhTHdD-RUPesP7_sFT4"
}
```

##### Example 3: Create new RFP Response Document
**Source**: `examples/OpenAI_and_LLMs/Automate Your RFP Process with OpenAI Assistants.json`  
**Workflow**: Automate Your RFP Process with OpenAI Assistants

**Credentials**: `{{CREDENTIAL_googleDocsOAuth2Api}}`

**Configuration**:
```json
{
  "title": "={{ $json.doc_filename }}",
  "folderId": "=1y0I8MH32maIWCJh767mRE_NMHC6A3bUu"
}
```

##### Example 4: Retrieve Long Term Memories
**Source**: `examples/Telegram/🐋🤖 DeepSeek AI Agent + Telegram + LONG TERM Memory 🧠.json`  
**Workflow**: 🐋🤖 DeepSeek AI Agent + Telegram + LONG TERM Memory 🧠

**Credentials**: `{{CREDENTIAL_googleDocsOAuth2Api}}`

**Configuration**:
```json
{
  "operation": "get",
  "documentURL": "[Google Doc ID]"
}
```

##### Example 5: Add Metadata to Response Doc
**Source**: `examples/OpenAI_and_LLMs/Automate Your RFP Process with OpenAI Assistants.json`  
**Workflow**: Automate Your RFP Process with OpenAI Assistants

**Credentials**: `{{CREDENTIAL_googleDocsOAuth2Api}}`

**Configuration**:
```json
{
  "actionsUi": {
    "actionFields": [
      {
        "text": "=Title: {{ $('Set Variables').item.json.doc_title }}\nDate generated: {{ $now.format(\"yyyy-MM-dd @ hh:mm\") }}\nRequested by: {{ $('Set Variables').item.json.reply_to }}\nExecution Id: http://localhost:5678/workflow/{{ $workflow.id }}/executions/{{ $execution.id }}\n\n---\n\n",
        "action": "insert"
      }
    ]
  },
  "operation": "update",
  "documentURL": "={{ $json.id }}"
}
```


---

### GoogleDocsTool
**Type**: `n8n-nodes-base.googleDocsTool`  
**Description**: n8n node for googleDocsTool operations.  
**Auth Required**: `googleDocsOAuth2Api`  
**Usage Count**: 3 templates

#### Common Operations/Modes
- `update`

#### Usage Examples

##### Example 1: Save Long Term Memories
**Source**: `examples/Telegram/🐋🤖 DeepSeek AI Agent + Telegram + LONG TERM Memory 🧠.json`  
**Workflow**: 🐋🤖 DeepSeek AI Agent + Telegram + LONG TERM Memory 🧠

**Credentials**: `{{CREDENTIAL_googleDocsOAuth2Api}}`

**Configuration**:
```json
{
  "actionsUi": {
    "actionFields": [
      {
        "text": "= Memory: {{ $fromAI('memory') }} - Date: {{ $now }} ",
        "action": "insert"
      }
    ]
  },
  "operation": "update",
  "documentURL": "[Google Doc ID]",
  "descriptionType": "manual",
  "toolDescription": "Save memories"
}
```

##### Example 2: Save Long Term Memories
**Source**: `examples/Telegram/🤖🧠 AI Agent Chatbot + LONG TERM Memory + Note Storage + Telegram.json`  
**Workflow**: 🤖🧠 AI Agent Chatbot + LONG TERM Memory + Note Storage + Telegram

**Credentials**: `{{CREDENTIAL_googleDocsOAuth2Api}}`

**Configuration**:
```json
{
  "actionsUi": {
    "actionFields": [
      {
        "text": "={ \n \"memory\": \"{{ $fromAI('memory') }}\",\n \"date\": \"{{ $now }}\"\n}",
        "action": "insert"
      }
    ]
  },
  "operation": "update",
  "documentURL": "[Google Doc ID]",
  "descriptionType": "manual",
  "toolDescription": "Save Memory"
}
```

##### Example 3: Save Notes
**Source**: `examples/Telegram/🤖🧠 AI Agent Chatbot + LONG TERM Memory + Note Storage + Telegram.json`  
**Workflow**: 🤖🧠 AI Agent Chatbot + LONG TERM Memory + Note Storage + Telegram

**Credentials**: `{{CREDENTIAL_googleDocsOAuth2Api}}`

**Configuration**:
```json
{
  "actionsUi": {
    "actionFields": [
      {
        "text": "={ \n \"note\": \"{{ $fromAI('memory') }}\",\n \"date\": \"{{ $now }}\"\n}",
        "action": "insert"
      }
    ]
  },
  "operation": "update",
  "documentURL": "[Google Doc ID]",
  "descriptionType": "manual",
  "toolDescription": "Save Notes"
}
```


---

### GoogleCalendar
**Type**: `n8n-nodes-base.googleCalendar`  
**Description**: Create, read, update and delete Google Calendar events.  
**Auth Required**: `googleCalendarOAuth2Api`  
**Usage Count**: 6 templates

#### Common Operations/Modes
- `get`
- `getAll`
- `update`

#### Usage Examples

##### Example 1: Create Appointment
**Source**: `examples/Forms_and_Surveys/Qualifying Appointment Requests with AI & n8n Forms.json`  
**Workflow**: Qualifying Appointment Requests with AI & n8n Forms

**Credentials**: `{{CREDENTIAL_googleCalendarOAuth2Api}}`

**Configuration**:
```json
{
  "end": "={{ DateTime.fromISO($('Execute Workflow Trigger').first().json.dateTime).plus(30, 'minute').toISO() }}",
  "start": "={{ $('Execute Workflow Trigger').first().json.dateTime }}",
  "calendar": {
    "__rl": true,
    "mode": "list",
    "value": "c_5792bdf04bc395cbcbc6f7b754268245a33779d36640cc80a357711aa2f09a0a@group.calendar.google.com",
    "cachedResultName": "n8n-events"
  },
  "additionalFields": {
    "summary": "=Appointment Scheduled - {{ $('Execute Workflow Trigger').item.json.name }} & Jim",
    "attendees": [
      "={{ $('Execute Workflow Trigger').item.json.email }}"
    ],
    "description": "={{ $('Summarise Enquiry').first().json.text }}\n\nOriginal message:\n> {{ $('Execute Workflow Trigger').item.json.enquiry }}",
    "conferenceDataUi": {
      "conferenceDataValues": {
        "conferenceSolution": "hangoutsMeet"
      }
    }
  }
}
```

##### Example 2: Get Calendar Event
**Source**: `examples/OpenAI_and_LLMs/Actioning Your Meeting Next Steps using Transcripts and AI.json`  
**Workflow**: Actioning Your Meeting Next Steps using Transcripts and AI

**Credentials**: `{{CREDENTIAL_googleCalendarOAuth2Api}}`

**Configuration**:
```json
{
  "eventId": "abc123",
  "options": {},
  "calendar": {
    "__rl": true,
    "mode": "list",
    "value": "c_5792bdf04bc395cbcbc6f7b754268245a33779d36640cc80a357711aa2f09a0a@group.calendar.google.com",
    "cachedResultName": "n8n-events"
  },
  "operation": "get"
}
```

##### Example 3: Add Attendee to Invite
**Source**: `examples/OpenAI_and_LLMs/Actioning Your Meeting Next Steps using Transcripts and AI.json`  
**Workflow**: Actioning Your Meeting Next Steps using Transcripts and AI

**Credentials**: `{{CREDENTIAL_googleCalendarOAuth2Api}}`

**Configuration**:
```json
{
  "eventId": "={{ $('Create Calendar Event1').item.json.id }}",
  "calendar": {
    "__rl": true,
    "mode": "list",
    "value": "c_5792bdf04bc395cbcbc6f7b754268245a33779d36640cc80a357711aa2f09a0a@group.calendar.google.com",
    "cachedResultName": "n8n-events"
  },
  "operation": "update",
  "updateFields": {
    "attendees": [
      "={{ $json.name }} <{{ $json.email }}>"
    ]
  }
}
```

##### Example 4: Google Calendar
**Source**: `examples/OpenAI_and_LLMs/Suggest meeting slots using AI.json`  
**Workflow**: Calendar_scheduling

**Credentials**: `{{CREDENTIAL_googleCalendarOAuth2Api}}`

**Configuration**:
```json
{
  "options": {
    "timeMax": "={{ $now.plus(1, 'month').toISO() }}",
    "timeMin": "={{ $now.minus(1, 'day').toISO() }}",
    "singleEvents": true
  },
  "calendar": {
    "__rl": true,
    "mode": "list",
    "value": "your_email@gmail.com",
    "cachedResultName": "your_email@gmail.com"
  },
  "operation": "getAll",
  "returnAll": true
}
```

##### Example 5: Check For Upcoming Meetings
**Source**: `examples/WhatsApp/Automate Sales Meeting Prep with AI & APIFY Sent To WhatsApp.json`  
**Workflow**: Automate Sales Meeting Prep with AI & APIFY Sent To WhatsApp

**Credentials**: `{{CREDENTIAL_googleCalendarOAuth2Api}}`

**Configuration**:
```json
{
  "limit": 1,
  "options": {
    "orderBy": "startTime",
    "timeMax": "={{ $now.toUTC().plus(1, 'hour') }}",
    "timeMin": "={{ $now.toUTC() }}",
    "singleEvents": true
  },
  "calendar": {
    "__rl": true,
    "mode": "list",
    "value": "c_5792bdf04bc395cbcbc6f7b754268245a33779d36640cc80a357711aa2f09a0a@group.calendar.google.com",
    "cachedResultName": "n8n-events"
  },
  "operation": "getAll"
}
```


---

### GoogleCalendarTool
**Type**: `n8n-nodes-base.googleCalendarTool`  
**Description**: Wraps Google Calendar as an AI agent tool for scheduling.  
**Auth Required**: `googleCalendarOAuth2Api`  
**Usage Count**: 8 templates

#### Common Operations/Modes
- `getAll`

#### Usage Examples

##### Example 1: Create Event
**Source**: `examples/Airtable/AI Agent for project management and meetings with Airtable and Fireflies.json`  
**Workflow**: AI Agent for project management and meetings with Airtable and Fireflies

**Credentials**: `{{CREDENTIAL_googleCalendarOAuth2Api}}`

**Configuration**:
```json
{
  "end": "={{ $fromAI(\"end_date_time\",\"Date and time of meeting end\",\"string\") }}",
  "start": "={{ $fromAI(\"start_date_time\",\"Date and time of meeting start\",\"string\") }}",
  "calendar": {
    "__rl": true,
    "mode": "list",
    "value": "philipp@lowcoding.dev",
    "cachedResultName": "philipp@lowcoding.dev"
  },
  "descriptionType": "manual",
  "toolDescription": "=Use tool to create Google Calendar Event. Use this tool only when transcript contains information that call should be scheduled.",
  "additionalFields": {
    "summary": "={{ $fromAI(\"meeting_name\",\"Meeting name\",\"string\") }}",
    "attendees": [
      "={{ $fromAI(\"email\",\"client email\",\"string\") }}"
    ],
    "conferenceDataUi": {
      "conferenceDataValues": {
        "conferenceSolution": "hangoutsMeet"
      }
    }
  }
}
```

##### Example 2: Google Calendar
**Source**: `examples/HR_and_Recruitment/HR Job Posting and Evaluation with AI.json`  
**Workflow**: HR Job Posting and Evaluation with AI

**Credentials**: `{{CREDENTIAL_googleCalendarOAuth2Api}}`

**Configuration**:
```json
{
  "end": "={{ $fromAI(\"end_time\", \"The end time for the meeting\", \"string\", \"2025-01-01T09:00:00Z\") }}",
  "start": "={{ $fromAI(\"start_time\", \"The start time for the meeting\", \"string\", \"2025-01-01T09:00:00Z\") }}\n",
  "calendar": {
    "__rl": true,
    "mode": "list",
    "value": "gaturanjenga@gmail.com",
    "cachedResultName": "gaturanjenga@gmail.com"
  },
  "additionalFields": {
    "location": "=Online"
  }
}
```

##### Example 3: Google Calendar - Get Events
**Source**: `examples/OpenAI_and_LLMs/AI Agent _ Google calendar assistant using OpenAI.json`  
**Workflow**: AI Agent : Google calendar assistant using OpenAI

**Credentials**: `{{CREDENTIAL_googleCalendarOAuth2Api}}`

**Configuration**:
```json
{
  "options": {
    "timeMax": "={{ $fromAI('end_date') }}",
    "timeMin": "={{ $fromAI('start_date') }}"
  },
  "calendar": {
    "__rl": true,
    "mode": "list",
    "value": "",
    "cachedResultName": ""
  },
  "operation": "getAll",
  "descriptionType": "manual",
  "toolDescription": "Use this tool when you’re asked to retrieve events data."
}
```

##### Example 4: Google Calendar Read
**Source**: `examples/Other_Integrations_and_Use_Cases/LINE Assistant with Google Calendar and Gmail Integration.json`  
**Workflow**: LINE Assistant with Google Calendar and Gmail Integration

**Credentials**: `{{CREDENTIAL_googleCalendarOAuth2Api}}`

**Configuration**:
```json
{
  "limit": 5,
  "options": {
    "timeMax": "={{ $fromAI(\"enddate\",\"end date user mentioned about\") }}",
    "timeMin": "={{ $fromAI(\"startdate\",\"start date user mentioned about\") }}"
  },
  "calendar": {
    "__rl": true,
    "mode": "list",
    "value": "***********@gmail.com",
    "cachedResultName": "***********@gmail.com"
  },
  "operation": "getAll"
}
```

##### Example 5: Google Calendar
**Source**: `examples/Telegram/Angie, Personal AI Assistant with Telegram Voice and Text.json`  
**Workflow**: Angie, Personal AI Assistant with Telegram Voice and Text

**Credentials**: `{{CREDENTIAL_googleCalendarOAuth2Api}}`

**Configuration**:
```json
{
  "options": {
    "fields": "=items(summary, start(dateTime))",
    "timeMin": "={{$fromAI(\"date\",\"the date after which to fetch the messages in format YYYY-MM-DDTHH:MM:SS\")}}"
  },
  "calendar": {
    "__rl": true,
    "mode": "list",
    "value": "derekcheungsa@gmail.com",
    "cachedResultName": "derekcheungsa@gmail.com"
  },
  "operation": "getAll"
}
```


---

### GoogleAnalytics
**Type**: `n8n-nodes-base.googleAnalytics`  
**Description**: Query Google Analytics 4 reports and real-time data.  
**Auth Required**: `googleAnalyticsOAuth2`  
**Usage Count**: 14 templates

#### Usage Examples

##### Example 1: Google Analytics Letzte 7 Tage
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Create a Google Analytics Data Report with AI and sent it to E-Mail and Telegram.json`  
**Workflow**: Google Analytics: Weekly Report

**Credentials**: `{{CREDENTIAL_googleAnalyticsOAuth2}}`

**Configuration**:
```json
{
  "metricsGA4": {
    "metricValues": [
      {
        "listName": "screenPageViews"
      },
      {},
      {
        "listName": "sessions"
      },
      {
        "listName": "sessionsPerUser"
      },
      {
        "name": "averageSessionDuration",
        "listName": "other"
      },
      {
        "name": "ecommercePurchases",
        "listName": "other"
      },
      {
        "name": "averagePurchaseRevenue",
        "listName": "other"
      },
      {
        "name": "purchaseRevenue",
        "listName": "other"
      }
    ]
  },
  "propertyId": {
    "__rl": true,
    "mode": "list",
    "value": "345060083",
    "cachedResultUrl": "https://analytics.google.com/analytics/web/#/p345060083/",
    "cachedResultName": "https://www.ep-reisen.de  – GA4"
  },
  "dimensionsGA4": {
    "dimensionValues": [
      {}
    ]
  },
  "additionalFields": {}
}
```

##### Example 2: Google Analytics: Past 7 days of the previous year
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Create a Google Analytics Data Report with AI and sent it to E-Mail and Telegram.json`  
**Workflow**: Google Analytics: Weekly Report

**Credentials**: `{{CREDENTIAL_googleAnalyticsOAuth2}}`

**Configuration**:
```json
{
  "endDate": "={{ $json.endDate }}",
  "dateRange": "custom",
  "startDate": "={{ $json.startDate }}",
  "metricsGA4": {
    "metricValues": [
      {
        "listName": "screenPageViews"
      },
      {},
      {
        "listName": "sessions"
      },
      {
        "listName": "sessionsPerUser"
      },
      {
        "name": "averageSessionDuration",
        "listName": "other"
      },
      {
        "name": "ecommercePurchases",
        "listName": "other"
      },
      {
        "name": "averagePurchaseRevenue",
        "listName": "other"
      },
      {
        "name": "purchaseRevenue",
        "listName": "other"
      }
    ]
  },
  "propertyId": {
    "__rl": true,
    "mode": "list",
    "value": "345060083",
    "cachedResultUrl": "https://analytics.google.com/analytics/web/#/p345060083/",
    "cachedResultName": "https://www.ep-reisen.de  – GA4"
  },
  "dimensionsGA4": {
    "dimensionValues": [
      {}
    ]
  },
  "additionalFields": {}
}
```

##### Example 3: Get Page Engagement Stats for this week
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Send Google analytics data to A.I. to analyze then save results in Baserow.json`  
**Workflow**: Google analytics template

**Credentials**: `{{CREDENTIAL_googleAnalyticsOAuth2}}`

**Configuration**:
```json
{
  "simple": false,
  "returnAll": true,
  "metricsGA4": {
    "metricValues": [
      {
        "name": "screenPageViews",
        "listName": "other"
      },
      {
        "name": "activeUsers",
        "listName": "other"
      },
      {
        "name": "screenPageViewsPerUser",
        "listName": "other"
      },
      {
        "name": "eventCount",
        "listName": "other"
      }
    ]
  },
  "propertyId": {
    "__rl": true,
    "mode": "id",
    "value": "460520224"
  },
  "dimensionsGA4": {
    "dimensionValues": [
      {
        "name": "unifiedScreenName",
        "listName": "other"
      }
    ]
  },
  "additionalFields": {}
}
```

##### Example 4: Get Page Engagement Stats for prior week
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Send Google analytics data to A.I. to analyze then save results in Baserow.json`  
**Workflow**: Google analytics template

**Configuration**:
```json
{
  "simple": false,
  "endDate": "2024-10-23T00:00:00",
  "dateRange": "custom",
  "returnAll": true,
  "startDate": "={{$today.minus({days: 14})}}",
  "metricsGA4": {
    "metricValues": [
      {
        "name": "screenPageViews",
        "listName": "other"
      },
      {
        "name": "activeUsers",
        "listName": "other"
      },
      {
        "name": "screenPageViewsPerUser",
        "listName": "other"
      },
      {
        "name": "eventCount",
        "listName": "other"
      }
    ]
  },
  "propertyId": {
    "__rl": true,
    "mode": "id",
    "value": "460520224"
  },
  "dimensionsGA4": {
    "dimensionValues": [
      {
        "name": "unifiedScreenName",
        "listName": "other"
      }
    ]
  },
  "additionalFields": {}
}
```

##### Example 5: Get Google Search Results for this week
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Send Google analytics data to A.I. to analyze then save results in Baserow.json`  
**Workflow**: Google analytics template

**Credentials**: `{{CREDENTIAL_googleAnalyticsOAuth2}}`

**Configuration**:
```json
{
  "simple": false,
  "returnAll": true,
  "metricsGA4": {
    "metricValues": [
      {
        "name": "activeUsers",
        "listName": "other"
      },
      {
        "name": "engagedSessions",
        "listName": "other"
      },
      {
        "name": "engagementRate",
        "listName": "other"
      },
      {
        "name": "eventCount",
        "listName": "other"
      },
      {
        "name": "organicGoogleSearchAveragePosition",
        "listName": "other"
      },
      {
        "name": "organicGoogleSearchClickThroughRate",
        "listName": "other"
      },
      {
        "name": "organicGoogleSearchClicks",
        "listName": "other"
      },
      {
        "name": "organicGoogleSearchImpressions",
        "listName": "other"
      }
    ]
  },
  "propertyId": {
    "__rl": true,
    "mode": "id",
    "value": "460520224"
  },
  "dimensionsGA4": {
    "dimensionValues": [
      {
        "name": "landingPagePlusQueryString",
        "listName": "other"
      }
    ]
  },
  "additionalFields": {}
}
```


---

### GoogleAnalyticsTool
**Type**: `n8n-nodes-base.googleAnalyticsTool`  
**Description**: n8n node for googleAnalyticsTool operations.  
**Auth Required**: `googleAnalyticsOAuth2`  
**Usage Count**: 1 templates

#### Usage Examples

##### Example 1: Google Analytics
**Source**: `examples/Other_Integrations_and_Use_Cases/UTM Link Creator & QR Code Generator with Scheduled Google Analytics Reports.json`  
**Workflow**: UTM Link Creator & QR Code Generator with Scheduled Google Analytics Reports

**Credentials**: `{{CREDENTIAL_googleAnalyticsOAuth2}}`

**Configuration**:
```json
{
  "metricsGA4": {
    "metricValues": [
      {
        "listName": "sessions"
      }
    ]
  },
  "propertyId": {
    "__rl": true,
    "mode": "list",
    "value": "404306108",
    "cachedResultUrl": "https://analytics.google.com/analytics/web/#/p404306108/",
    "cachedResultName": "East Coast Concrete Coating"
  },
  "dimensionsGA4": {
    "dimensionValues": [
      {},
      {
        "listName": "sourceMedium"
      }
    ]
  },
  "additionalFields": {}
}
```


---

### GoogleCloudNaturalLanguage
**Type**: `n8n-nodes-base.googleCloudNaturalLanguage`  
**Description**: n8n node for googleCloudNaturalLanguage operations.  
**Auth Required**: `googleCloudNaturalLanguageOAuth2Api`  
**Usage Count**: 5 templates

#### Usage Examples

##### Example 1: Google Cloud Natural Language
**Source**: `examples/Notion/Add positive feedback messages to a table in Notion.json`  
**Workflow**: Add positive feedback messages to a table in Notion

**Credentials**: `{{CREDENTIAL_googleCloudNaturalLanguageOAuth2Api}}`

**Configuration**:
```json
{
  "content": "={{$json[\"Any suggestions for us? \"]}}",
  "options": {}
}
```

##### Example 2: Google Cloud Natural Language
**Source**: `examples/Other_Integrations_and_Use_Cases/Analyze feedback and send a message on Mattermost.json`  
**Workflow**: Analyze the sentiment of feedback and send a message on Mattermost

**Credentials**: `{{CREDENTIAL_googleCloudNaturalLanguageOAuth2Api}}`

**Configuration**:
```json
{
  "content": "={{$node[\"Typeform Trigger\"].json[\"What did you think about the event?\"]}}",
  "options": {}
}
```

##### Example 3: Analyze Form Submission
**Source**: `examples/Other_Integrations_and_Use_Cases/Automate testimonials in Strapi with n8n.json`  
**Workflow**: Automate testimonials in Strapi with n8n

**Credentials**: `{{CREDENTIAL_googleCloudNaturalLanguageOAuth2Api}}`

**Configuration**:
```json
{
  "content": "={{$json[\"Content\"]}}",
  "options": {}
}
```

##### Example 4: Analyze Tweet
**Source**: `examples/Other_Integrations_and_Use_Cases/Automate testimonials in Strapi with n8n.json`  
**Workflow**: Automate testimonials in Strapi with n8n

**Credentials**: `{{CREDENTIAL_googleCloudNaturalLanguageOAuth2Api}}`

**Configuration**:
```json
{
  "content": "={{$json[\"Content\"]}}",
  "options": {}
}
```

##### Example 5: Google Cloud Natural Language
**Source**: `examples/PDF_and_Document_Processing/ETL pipeline for text processing.json`  
**Workflow**: ETL pipeline

**Credentials**: `{{CREDENTIAL_googleCloudNaturalLanguageOAuth2Api}}`

**Configuration**:
```json
{
  "content": "={{$node[\"MongoDB\"].json[\"text\"]}}",
  "options": {}
}
```


---

### GoogleCloudStorage
**Type**: `n8n-nodes-base.googleCloudStorage`  
**Description**: n8n node for googleCloudStorage operations.  
**Auth Required**: `googleCloudStorageOAuth2Api`  
**Usage Count**: 1 templates

#### Common Operations/Modes
- `object`

#### Usage Examples

##### Example 1: Google Cloud Storage
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Vector Database as a Big Data Analysis Tool for AI Agents [1_3 anomaly][1_2 KNN].json`  
**Workflow**: [1/3 - anomaly detection] [1/2 - KNN classification] Batch upload dataset to Qdrant (crops dataset)

**Credentials**: `{{CREDENTIAL_googleCloudStorageOAuth2Api}}`

**Configuration**:
```json
{
  "resource": "object",
  "returnAll": true,
  "bucketName": "n8n-qdrant-demo",
  "listFilters": {
    "prefix": "agricultural-crops"
  },
  "requestOptions": {}
}
```


---

### GooglePerspective
**Type**: `n8n-nodes-base.googlePerspective`  
**Description**: n8n node for googlePerspective operations.  
**Auth Required**: `googlePerspectiveOAuth2Api`  
**Usage Count**: 1 templates

#### Usage Examples

##### Example 1: Google Perspective
**Source**: `examples/Telegram/Detect toxic language in Telegram messages.json`  
**Workflow**: Detect toxic language in Telegram messages

**Credentials**: `{{CREDENTIAL_googlePerspectiveOAuth2Api}}`

**Configuration**:
```json
{
  "text": "={{$json[\"message\"][\"text\"]}}",
  "options": {
    "languages": "en"
  },
  "requestedAttributesUi": {
    "requestedAttributesValues": [
      {
        "attributeName": "identity_attack"
      },
      {
        "attributeName": "threat"
      },
      {
        "attributeName": "profanity"
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

