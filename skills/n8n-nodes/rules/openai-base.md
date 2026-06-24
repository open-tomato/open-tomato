---
tags: [n8n, openai, gpt, dall-e, whisper, tts, ai]
category: openai-base
description: Direct OpenAI API nodes for chat, image generation, transcription and TTS
---

# OpenAI Base Nodes

## Overview
Direct OpenAI API nodes for chat, image generation, transcription and TTS.

## Nodes in This Category

---

### OpenAi
**Type**: `n8n-nodes-base.openAi`  
**Description**: Direct OpenAI API node for text generation, DALL-E image generation, Whisper transcription, and TTS.  
**Auth Required**: `openAiApi`  
**Usage Count**: 26 templates

#### Common Operations/Modes
- `chat`
- `edit`
- `image`

#### Usage Examples

##### Example 1: Summary
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Scrape and summarize posts of a news site without RSS feed using AI and save them to a NocoDB.json`  
**Workflow**: News Extraction

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "model": "gpt-4-1106-preview",
  "prompt": {
    "messages": [
      {
        "content": "=Create a summary in less than 70 words {{ $json[\"content\"] }}"
      }
    ]
  },
  "options": {},
  "resource": "chat"
}
```

##### Example 2: Generate reply
**Source**: `examples/Gmail_and_Email_Automation/Send a ChatGPT email reply and save responses to Google Sheets.json`  
**Workflow**: Send a ChatGPT email reply and save responses to Google Sheets

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "prompt": "=From: {{ $json.from.value }}\nTo: {{ $json.to.value }}\nSubject: {{ $json.subject }}\nBody: {{ $json.reply }}\n\n\nReply: ",
  "options": {
    "maxTokens": "={{ $('Configure').first().json.replyTokenSize }}"
  }
}
```

**Prompt/System Message**:
```
=From: {{ $json.from.value }}
To: {{ $json.to.value }}
Subject: {{ $json.subject }}
Body: {{ $json.reply }}


Reply: 
```

##### Example 3: Qualify leads with GPT
**Source**: `examples/Google_Drive_and_Google_Sheets/Qualify new leads in Google Sheets via OpenAI_s GPT-4.json`  
**Workflow**: Qualify new leads in Google Sheets via OpenAI's GPT-4

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "prompt": {
    "messages": [
      {
        "role": "system",
        "content": "Your task is to qualify incoming leads. Leads are form submissions to a closed community group. Use the following criteria for a quality lead:\n\n1. We are looking for decision makers who run companies or who have some teams. The bigger the team - the better. Basically, everyone with some level of responsibility should be accepted. This is the main criterion.\n2. Email from a non-standard domain. Ideally this should be a corporate domain, but this is a secondary criterion.\n\nPlease thing step by step whether a lead is quality or not?\n\nIf at least one of the criteria satisfy, reply with \"qualified\" in response. Otherwise reply \"not qualified\". Reply with a JSON of the following structure: {\"rating\":\"string\",\"explanation\":\"string\"}. Reply only with with the JSON and nothing more!"
      },
      {
        "content": "=Here's a lead info:\nName: {{ $json['Your name'] }}\nEmail: {{ $json['Email Address'] }}\nBusiness area: {{ $json['Your business area'] }}\nSize of the team: {{ $json['Your team size'] }}"
      }
    ]
  },
  "options": {
    "temperature": 0.3
  },
  "resource": "chat",
  "chatModel": "gpt-4-turbo-preview"
}
```

**Prompt/System Message**:
```
Your task is to qualify incoming leads. Leads are form submissions to a closed community group. Use the following criteria for a quality lead:

1. We are looking for decision makers who run companies or who have some teams. The bigger the team - the better. Basically, everyone with some level of responsibility should be accepted. This is the main criterion.
2. Email from a non-standard domain. Ideally this should be a corporate domain, but this is a secondary criterion.

Please thing step by step whether a lead is quality or not?

If at least one of the criteria satisfy, reply with "qualified" in response. Otherwise reply "not qualified". Reply with a JSON of the following structure: {"rating":"string","explanation":"string"}. Reply only with with the JSON and nothing more!
```

##### Example 4: OpenAI Summary
**Source**: `examples/Instagram_Twitter_Social_Media/Reddit AI digest.json`  
**Workflow**: Reddit AI digest

**Configuration**:
```json
{
  "input": "={{ $json.selftextTrimmed }}",
  "options": {
    "temperature": 0.3
  },
  "operation": "edit",
  "instruction": "Summarise what this is talking about in a meta way less than 20 words. Ignore punctuation in your summary and return a short, human readable summary."
}
```

##### Example 5: OpenAI Classify
**Source**: `examples/Instagram_Twitter_Social_Media/Reddit AI digest.json`  
**Workflow**: Reddit AI digest

**Configuration**:
```json
{
  "prompt": "=Decide whether a reddit post is about n8n.io, a workflow automation low code tool that can be self-hosted, or not.\nReddit Post: {{ $json.selftextTrimmed }}\nAbout n8n?: Yes/No",
  "options": {
    "maxTokens": 32
  },
  "simplifyOutput": false
}
```

**Prompt/System Message**:
```
=Decide whether a reddit post is about n8n.io, a workflow automation low code tool that can be self-hosted, or not.
Reddit Post: {{ $json.selftextTrimmed }}
About n8n?: Yes/No
```


---

### OpenAi
**Type**: `@n8n/n8n-nodes-langchain.openAi`  
**Description**: LangChain wrapper around OpenAI for text, image, audio and assistant operations.  
**Auth Required**: `openAiApi`  
**Usage Count**: 97 templates

#### Common Operations/Modes
- `analyze`
- `assistant`
- `audio`
- `create`
- `file`
- `image`
- `transcribe`
- `update`

#### Usage Examples

##### Example 1: OpenAI
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Analyze tradingview.com charts with Chrome extension, N8N and OpenAI.json`  
**Workflow**: chrome extension backend with AI

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "text": "You are an expert financial analyst tasked with providing an advanced technical analyses of a stock or crypto currency chart provided. Your analysis will be based on various technical indicators and will provide simple insights for novice traders. Just explain to traders were you expect the market is moving. Also warn them this is not a binding advice. Make sure to explain everything in infant language.",
  "modelId": {
    "__rl": true,
    "mode": "list",
    "value": "gpt-4o-mini",
    "cachedResultName": "GPT-4O-MINI"
  },
  "options": {},
  "resource": "image",
  "inputType": "base64",
  "operation": "analyze"
}
```

**Prompt/System Message**:
```
You are an expert financial analyst tasked with providing an advanced technical analyses of a stock or crypto currency chart provided. Your analysis will be based on various technical indicators and will provide simple insights for novice traders. Just explain to traders were you expect the market is moving. Also warn them this is not a binding advice. Make sure to explain everything in infant language.
```

##### Example 2: Processing for Telegram
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Create a Google Analytics Data Report with AI and sent it to E-Mail and Telegram.json`  
**Workflow**: Google Analytics: Weekly Report

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "modelId": {
    "__rl": true,
    "mode": "list",
    "value": "gpt-4o-mini",
    "cachedResultName": "GPT-4O-MINI"
  },
  "options": {},
  "messages": {
    "values": [
      {
        "content": "=Convert the following text from HTML to normal text:\n\n{{ $json.message.content }}\n\nPlease format the table so that each metric is a separate paragraph!\n\nExample:\n\nTotal views: xx.xxx\nTotal views previous year: xx,xxx\nDifference: x.xx %\n\nTotal users: xx,xxx\nTotal users previous year: xx,xxx\nDifference: -x.xx %"
      }
    ]
  }
}
```

##### Example 3: Analyse Image
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Enrich Property Inventory Survey with Image Recognition and AI Agent.json`  
**Workflow**: Enrich Property Inventory Survey with Image Recognition and AI Agent

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "text": "=Focus on the {{ $json.Title }} in the image - we'll refer to this as the \"object\". Identify the following attributes of the object. If you cannot determine confidently, then leave blank and move to next attribute.\n* Decription of the object.\n* The model/make of the object.\n* The material(s) used in the construction of the object.\n* The color(s) of the object\n* The condition of the object. Use one of poor, good, excellent.\n",
  "options": {},
  "resource": "image",
  "imageUrls": "={{ $json.Image[0].thumbnails.large.url }}",
  "operation": "analyze"
}
```

**Prompt/System Message**:
```
=Focus on the {{ $json.Title }} in the image - we'll refer to this as the "object". Identify the following attributes of the object. If you cannot determine confidently, then leave blank and move to next attribute.
* Decription of the object.
* The model/make of the object.
* The material(s) used in the construction of the object.
* The color(s) of the object
* The condition of the object. Use one of poor, good, excellent.

```

##### Example 4: OpenAI
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Extract insights & analyse YouTube comments via AI Agent chat.json`  
**Workflow**: Extract insights & analyse YouTube comments via AI Agent chat

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "text": "={{ $('Execute Workflow Trigger').item.json.query.prompt }}",
  "modelId": {
    "__rl": true,
    "mode": "list",
    "value": "gpt-4o",
    "cachedResultName": "GPT-4O"
  },
  "options": {},
  "resource": "image",
  "imageUrls": "={{ $('Execute Workflow Trigger').item.json.query.url }}",
  "operation": "analyze"
}
```

##### Example 5: Article Prep
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Hacker News to Video Content.json`  
**Workflow**: Hacker News to Video Template - AlexK1919

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "modelId": {
    "__rl": true,
    "mode": "list",
    "value": "gpt-4o-mini",
    "cachedResultName": "GPT-4O-MINI"
  },
  "options": {},
  "messages": {
    "values": [
      {
        "content": "=prepare the following summary for a newsletter where the article will be 1 of several presented in the newsletter:\n\n{{ $('Article Analysis').first().json.output.summary }}\n\nMake sure the Article Blurb lenght is less than 15 words.\n\nThen, create 2 Summary Blurbs, making sure each is less than 15 words.\n\nAlso create 2 image prompts that is less than 15 words long for each Summary Blurb"
      },
      {
        "role": "system",
        "content": "Output in markdown format\nArticle Title\nArticle Blurb\nSummary Blurb 1\nSummary Blurb 2\nArticle Image\nImage Prompt 1\nImage Prompt 2"
      }
    ]
  },
  "jsonOutput": true
}
```


---

### Form
**Type**: `n8n-nodes-base.form`  
**Description**: n8n node for form operations.  
**Auth Required**: `none`  
**Usage Count**: 14 templates

#### Common Operations/Modes
- `completion`

#### Usage Examples

##### Example 1: Form Success
**Source**: `examples/Airtable/Handling Job Application Submissions with AI and n8n Forms.json`  
**Workflow**: Handling Job Application Submissions with AI and n8n Forms

**Configuration**:
```json
{
  "options": {},
  "operation": "completion",
  "completionTitle": "Application Success",
  "completionMessage": "Thank you for completing the application process.\nYour informaion is filed securely and will be reviewed by our team.\n\nWe will be in touch shortly."
}
```

##### Example 2: File Upload Retry
**Source**: `examples/Airtable/Handling Job Application Submissions with AI and n8n Forms.json`  
**Workflow**: Handling Job Application Submissions with AI and n8n Forms

**Configuration**:
```json
{
  "options": {
    "formTitle": "Please upload a CV",
    "formDescription": "Unfortunately, we were unable to process your previous file upload.\n\nTo continue, you must upload a valid CV in PDF format. "
  },
  "formFields": {
    "values": [
      {
        "fieldType": "file",
        "fieldLabel": "File Upload",
        "multipleFiles": false,
        "requiredField": true,
        "acceptFileTypes": "pdf"
      }
    ]
  }
}
```

##### Example 3: Redirect To Step 2 of 2
**Source**: `examples/Airtable/Handling Job Application Submissions with AI and n8n Forms.json`  
**Workflow**: Handling Job Application Submissions with AI and n8n Forms

**Configuration**:
```json
{
  "operation": "completion",
  "redirectUrl": "=https://<HOST>/form/job-application-step2of2?{{ $('Application Suitability Agent').first().json.output.urlEncode() }}",
  "respondWith": "redirect"
}
```

##### Example 4: Enter Date & Time
**Source**: `examples/Forms_and_Surveys/Qualifying Appointment Requests with AI & n8n Forms.json`  
**Workflow**: Qualifying Appointment Requests with AI & n8n Forms

**Configuration**:
```json
{
  "options": {
    "formTitle": "Enter a Date & Time",
    "formDescription": "=Please select a date and time"
  },
  "defineForm": "json",
  "jsonOutput": "={{\n[\n {\n \"fieldLabel\":\"Date\",\n \"requiredField\":true,\n \"fieldType\": \"dropdown\",\n \"fieldOptions\":\n Array(5).fill(0)\n .map((_,idx) => $now.plus(idx+1, 'day'))\n .filter(d => !d.isWeekend)\n .map(d => ({ option: d.format('EEE, d MMM') }))\n },\n {\n \"fieldLabel\": \"Time\",\n \"requiredField\": true,\n \"fieldType\": \"dropdown\",\n \"fieldOptions\": [\n { \"option\": \"9:00 am\" },\n { \"option\": \"10:00 am\" },\n { \"option\": \"11:00 am\" },\n { \"option\": \"12:00 pm\" },\n { \"option\": \"1:00 pm\" },\n { \"option\": \"2:00 pm\" },\n { \"option\": \"3:00 pm\" },\n { \"option\": \"4:00 pm\" },\n { \"option\": \"5:00 pm\" },\n { \"option\": \"6:00 pm\" }\n ]\n }\n]\n}}"
}
```

##### Example 5: Submission Success
**Source**: `examples/Airtable/Handling Job Application Submissions with AI and n8n Forms.json`  
**Workflow**: Handling Job Application Submissions with AI and n8n Forms

**Configuration**:
```json
{
  "options": {
    "formTitle": "CV Submission Successful!",
    "buttonLabel": "Continue",
    "formDescription": "We'll now redirect you to step 2 of 2 - our Application form. Please note, some fields will be prefilled with information from your CV. Feel free to amend this information as needed."
  },
  "formFields": {
    "values": [
      {
        "fieldType": "dropdown",
        "fieldLabel": "Acknowledgement",
        "multiselect": true,
        "fieldOptions": {
          "values": [
            {
              "option": "I understand my CV will be held soley for purpose of application and for no more than 90 days."
            }
          ]
        },
        "requiredField": true
      }
    ]
  }
}
```

