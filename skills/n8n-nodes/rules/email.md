---
tags: [n8n, email, gmail, smtp, imap, outlook, automation]
category: email
description: Read, send and process emails via Gmail, Outlook, SMTP/IMAP
---

# Email Automation

## Overview
Read, send and process emails via Gmail, Outlook, SMTP/IMAP.

## Nodes in This Category

---

### Gmail
**Type**: `n8n-nodes-base.gmail`  
**Description**: Reads, sends, labels, and manages Gmail messages.  
**Auth Required**: `gmailOAuth2`  
**Usage Count**: 48 templates

#### Common Operations/Modes
- `addLabels`
- `draft`
- `get`
- `getAll`
- `label`
- `markAsRead`
- `removeLabels`
- `reply`
- `sendAndWait`
- `thread`

#### Usage Examples

##### Example 1: Send Subscriber Email
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Deduplicate Scraping AI Grants for Eligibility using AI.json`  
**Workflow**: Deduplicate Scraping AI Grants for Eligibility using AI

**Credentials**: `{{CREDENTIAL_gmailOAuth2}}`

**Configuration**:
```json
{
  "sendTo": "={{ $json.Email }}",
  "message": "={{ $('Generate Email').first().json.html }}",
  "options": {},
  "subject": "Daily Newletter for Intersting US Grants"
}
```

##### Example 2: Wait for Approval
**Source**: `examples/Forms_and_Surveys/Qualifying Appointment Requests with AI & n8n Forms.json`  
**Workflow**: Qualifying Appointment Requests with AI & n8n Forms

**Credentials**: `{{CREDENTIAL_gmailOAuth2}}`

**Configuration**:
```json
{
  "sendTo": "=admin@example.com",
  "message": "=<h2>A new appointment request was submitted!</h2>\n<p>\nRequesting appointment date is <strong>{{ DateTime.fromISO($('Execute Workflow Trigger').item.json.dateTime).format('EEE, dd MMM @ t') }}</strong>.\n</p>\n<p>\nName: {{ $('Execute Workflow Trigger').first().json.name }}<br/>\nEmail: {{ $('Execute Workflow Trigger').first().json.email }}<br/>\nEnquiry Summary: {{ $json.text }}<br/>\nSubmitted at: {{ $('Execute Workflow Trigger').first().json.submittedAt }}\n</p>",
  "subject": "New Appointment Request!",
  "operation": "sendAndWait",
  "approvalOptions": {
    "values": {
      "approvalType": "double",
      "approveLabel": "Confirm"
    }
  }
}
```

**Prompt/System Message**:
```
=<h2>A new appointment request was submitted!</h2>
<p>
Requesting appointment date is <strong>{{ DateTime.fromISO($('Execute Workflow Trigger').item.json.dateTime).format('EEE, dd MMM @ t') }}</strong>.
</p>
<p>
Name: {{ $('Execute Workflow Trigger').first().json.name }}<br/>
Email: {{ $('Execute Workflow Trigger').first().json.email }}<br/>
Enquiry Summary: {{ $json.text }}<br/>
Submitted at: {{ $('Execute Workflow Trigger').first().json.submittedAt }}
</p>
```

##### Example 3: Send Draft
**Source**: `examples/Gmail_and_Email_Automation/AI-powered email processing autoresponder and response approval (Yes_No).json`  
**Workflow**: AI Email processing autoresponder with approval (Yes/No)

**Credentials**: `{{CREDENTIAL_gmailOAuth2}}`

**Configuration**:
```json
{
  "sendTo": "YOUR GMAIL ADDRESS",
  "message": "=<h3>MESSAGE</h3>\n{{ $('Email Trigger (IMAP)').item.json.textHtml }}\n\n<h3>AI RESPONSE</h3>\n{{ $json.output }}",
  "options": {},
  "subject": "=[Approval Required] {{ $('Email Trigger (IMAP)').item.json.subject }}",
  "operation": "sendAndWait",
  "approvalOptions": {
    "values": {
      "approvalType": "double"
    }
  }
}
```

**Prompt/System Message**:
```
=<h3>MESSAGE</h3>
{{ $('Email Trigger (IMAP)').item.json.textHtml }}

<h3>AI RESPONSE</h3>
{{ $json.output }}
```

##### Example 4: Get message content
**Source**: `examples/Gmail_and_Email_Automation/Auto-label incoming Gmail messages with AI nodes.json`  
**Workflow**: Auto-label incoming Gmail messages with AI nodes

**Credentials**: `{{CREDENTIAL_gmailOAuth2}}`

**Configuration**:
```json
{
  "simple": false,
  "options": {},
  "messageId": "={{ $json.id }}",
  "operation": "get"
}
```

##### Example 5: Get all labels
**Source**: `examples/Gmail_and_Email_Automation/Auto-label incoming Gmail messages with AI nodes.json`  
**Workflow**: Auto-label incoming Gmail messages with AI nodes

**Credentials**: `{{CREDENTIAL_gmailOAuth2}}`

**Configuration**:
```json
{
  "resource": "label",
  "returnAll": true
}
```


---

### GmailTool
**Type**: `n8n-nodes-base.gmailTool`  
**Description**: Wraps Gmail operations as an agent tool for AI-driven email management.  
**Auth Required**: `gmailOAuth2`  
**Usage Count**: 7 templates

#### Common Operations/Modes
- `addLabels`
- `create`
- `get`
- `getAll`
- `label`

#### Usage Examples

##### Example 1: Notify Client About Tasks
**Source**: `examples/Airtable/AI Agent for project management and meetings with Airtable and Fireflies.json`  
**Workflow**: AI Agent for project management and meetings with Airtable and Fireflies

**Credentials**: `{{CREDENTIAL_gmailOAuth2}}`

**Configuration**:
```json
{
  "sendTo": "={{ $fromAI(\"participant_email\",\"participant email \",\"string\") }}",
  "message": "=Summary:\n{{ $json.data.transcript.summary.bullet_gist }}\n\nAction Items:\n{{ $fromAI(\"participant_action_items\",\"participant action items \",\"string\") }}",
  "options": {
    "appendAttribution": false
  },
  "subject": "Meeting Summary",
  "emailType": "text",
  "descriptionType": "manual",
  "toolDescription": "=Use the tool to notify a participant of the meeting with meeting summary and his tasks.\nIMPORTANT: \n1. Please notify participants except for me. My email: [YOUR EMAIL HERE]\n2. When working with tasks - please send only the participant's tasks."
}
```

**Prompt/System Message**:
```
=Summary:
{{ $json.data.transcript.summary.bullet_gist }}

Action Items:
{{ $fromAI("participant_action_items","participant action items ","string") }}
```

##### Example 2: Gmail - read labels
**Source**: `examples/Gmail_and_Email_Automation/Basic Automatic Gmail Email Labelling with OpenAI and Gmail API.json`  
**Workflow**: Basic Automatic Gmail Email Labelling with OpenAI and Gmail API

**Credentials**: `{{CREDENTIAL_gmailOAuth2}}`

**Configuration**:
```json
{
  "resource": "label",
  "returnAll": true,
  "descriptionType": "manual",
  "toolDescription": "Tool to read all existing gmail labels"
}
```

##### Example 3: Gmail - get message
**Source**: `examples/Gmail_and_Email_Automation/Basic Automatic Gmail Email Labelling with OpenAI and Gmail API.json`  
**Workflow**: Basic Automatic Gmail Email Labelling with OpenAI and Gmail API

**Credentials**: `{{CREDENTIAL_gmailOAuth2}}`

**Configuration**:
```json
{
  "messageId": "={{ $fromAI('gmail_message_id', 'id of the gmail message, like 1944fdc33f544369', 'string') }}",
  "operation": "get",
  "descriptionType": "manual",
  "toolDescription": "Tool to read a specific message based on the message ID"
}
```

##### Example 4: Gmail - add label to message
**Source**: `examples/Gmail_and_Email_Automation/Basic Automatic Gmail Email Labelling with OpenAI and Gmail API.json`  
**Workflow**: Basic Automatic Gmail Email Labelling with OpenAI and Gmail API

**Credentials**: `{{CREDENTIAL_gmailOAuth2}}`

**Configuration**:
```json
{
  "labelIds": "={{ $fromAI('gmail_categories', 'array of label ids') }}",
  "messageId": "={{ $fromAI('gmail_message_id') }}",
  "operation": "addLabels",
  "descriptionType": "manual",
  "toolDescription": "Tool to add label to message"
}
```

##### Example 5: Gmail - create label
**Source**: `examples/Gmail_and_Email_Automation/Basic Automatic Gmail Email Labelling with OpenAI and Gmail API.json`  
**Workflow**: Basic Automatic Gmail Email Labelling with OpenAI and Gmail API

**Credentials**: `{{CREDENTIAL_gmailOAuth2}}`

**Configuration**:
```json
{
  "name": "={{ $fromAI('new_label_name', 'new label name', 'string' ) }} ",
  "options": {},
  "resource": "label",
  "operation": "create",
  "descriptionType": "manual",
  "toolDescription": "Tool to create a new label, only use if label does not already exist"
}
```


---

### EmailSend
**Type**: `n8n-nodes-base.emailSend`  
**Description**: Sends email via SMTP. Supports HTML body, attachments, and CC/BCC.  
**Auth Required**: `smtp`  
**Usage Count**: 16 templates

#### Common Operations/Modes
- `sendAndWait`

#### Usage Examples

##### Example 1: Send Email
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Create a Google Analytics Data Report with AI and sent it to E-Mail and Telegram.json`  
**Workflow**: Google Analytics: Weekly Report

**Credentials**: `{{CREDENTIAL_smtp}}`

**Configuration**:
```json
{
  "html": "={{ $json.message.content }}",
  "options": {},
  "subject": "Weekly Report: Google Analytics: Last 7 days",
  "toEmail": "friedemann.schuetz@ep-reisen.de",
  "fromEmail": "friedemann.schuetz@posteo.de"
}
```

##### Example 2: Approve Email
**Source**: `examples/Gmail_and_Email_Automation/A Very Simple _Human in the Loop_ Email Response System Using AI and IMAP.json`  
**Workflow**: Very simple Human in the loop system email with AI e IMAP

**Credentials**: `{{CREDENTIAL_smtp}}`

**Configuration**:
```json
{
  "message": "=<h3>MESSAGE</h3>\n{{ $('Email Trigger (IMAP)').item.json.textHtml }}\n\n<h3>AI RESPONSE</h3>\n{{ $json.email }}",
  "options": {},
  "subject": "=[Approval Required] {{ $('Email Trigger (IMAP)').item.json.subject }}",
  "toEmail": "info@n3witalia.com",
  "fromEmail": "info@n3witalia.com",
  "operation": "sendAndWait"
}
```

**Prompt/System Message**:
```
=<h3>MESSAGE</h3>
{{ $('Email Trigger (IMAP)').item.json.textHtml }}

<h3>AI RESPONSE</h3>
{{ $json.email }}
```

##### Example 3: Send Email
**Source**: `examples/HR_and_Recruitment/HR Job Posting and Evaluation with AI.json`  
**Workflow**: HR Job Posting and Evaluation with AI

**Credentials**: `{{CREDENTIAL_smtp}}`

**Configuration**:
```json
{
  "text": "={{ $json['Email Content'] }}",
  "options": {
    "appendAttribution": false
  },
  "subject": "={{ $json.Subject }}",
  "toEmail": "={{ $json.To }}",
  "fromEmail": "gatura@bulkbox.co.ke",
  "emailFormat": "text"
}
```

##### Example 4: SendEmailWithTopResources
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Learn Anything from HN - Get Top Resource Recommendations from Hacker News.json`  
**Workflow**: Learn Anything from HN - Get Top Resource Recommendations from Hacker News

**Credentials**: `{{CREDENTIAL_smtp}}`

**Configuration**:
```json
{
  "html": "=FYI, We read through {{ $('SplitOutChildrenIDs').all().length }} comments in search for the best.\n\n{{ $json.data }}",
  "options": {},
  "subject": "=Here are Top HN Recommendations for Learning {{ $('GetTopicFromToLearn').item.json[\"I want to learn\"] }}",
  "toEmail": "={{ $('GetTopicFromToLearn').item.json[\"What's your email ?\"] }}",
  "fromEmail": "allsmallnocaps@gmail.com"
}
```

##### Example 5: Send Email
**Source**: `examples/Gmail_and_Email_Automation/A Very Simple _Human in the Loop_ Email Response System Using AI and IMAP.json`  
**Workflow**: Very simple Human in the loop system email with AI e IMAP

**Credentials**: `{{CREDENTIAL_smtp}}`

**Configuration**:
```json
{
  "html": "={{ $('Set Email text').item.json.email }}",
  "options": {},
  "subject": "=Re: {{ $('Email Trigger (IMAP)').item.json.subject }}",
  "toEmail": "={{ $('Email Trigger (IMAP)').item.json.from }}",
  "fromEmail": "={{ $('Email Trigger (IMAP)').item.json.to }}"
}
```


---

### EmailReadImap
**Type**: `n8n-nodes-base.emailReadImap`  
**Description**: Reads emails from any IMAP mailbox.  
**Auth Required**: `imap`  
**Usage Count**: 6 templates

#### Usage Examples

##### Example 1: Email Trigger (IMAP)
**Source**: `examples/Gmail_and_Email_Automation/A Very Simple _Human in the Loop_ Email Response System Using AI and IMAP.json`  
**Workflow**: Very simple Human in the loop system email with AI e IMAP

**Credentials**: `{{CREDENTIAL_imap}}`

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 2: Read emails (IMAP)
**Source**: `examples/Gmail_and_Email_Automation/Summarize your emails with A.I. (via Openrouter) and send to Line messenger.json`  
**Workflow**: Summarize emails with A.I. then send to messenger

**Credentials**: `{{CREDENTIAL_imap}}`

**Configuration**:
```json
{
  "options": {},
  "postProcessAction": "nothing"
}
```

##### Example 3: Email Trigger (IMAP)
**Source**: `examples/Gmail_and_Email_Automation/create e-mail responses with fastmail and OpenAI.json`  
**Workflow**: create e-mail responses with fastmail and OpenAI

**Credentials**: `{{CREDENTIAL_imap}}`

**Configuration**:
```json
{
  "options": {
    "customEmailConfig": "[\"UNSEEN\"]"
  },
  "postProcessAction": "nothing",
  "downloadAttachments": true
}
```

##### Example 4: Email Trigger (IMAP)
**Source**: `examples/Gmail_and_Email_Automation/AI-powered email processing autoresponder and response approval (Yes_No).json`  
**Workflow**: AI Email processing autoresponder with approval (Yes/No)

**Credentials**: `{{CREDENTIAL_imap}}`

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 5: Email Trigger (IMAP)
**Source**: `examples/Gmail_and_Email_Automation/Effortless Email Management with AI-Powered Summarization & Review.json`  
**Workflow**: Effortless Email Management with AI

**Credentials**: `{{CREDENTIAL_imap}}`

**Configuration**:
```json
{
  "options": {}
}
```


---

### MicrosoftOutlook
**Type**: `n8n-nodes-base.microsoftOutlook`  
**Description**: Reads, sends, and manages Outlook emails, calendar events and contacts.  
**Auth Required**: `microsoftOutlookOAuth2Api`  
**Usage Count**: 19 templates

#### Common Operations/Modes
- `getAll`
- `move`
- `update`

#### Usage Examples

##### Example 1: Microsoft Outlook10
**Source**: `examples/Gmail_and_Email_Automation/Auto Categorise Outlook Emails with AI.json`  
**Workflow**: Auto Categorise Outlook Emails with AI

**Configuration**:
```json
{
  "folderId": {
    "__rl": true,
    "mode": "list",
    "value": "AQMkAGE3ZTU5MGMzLTFkNGItNGQ5Zi04MDQ1LThmNGFlMTVhYjMwYgAuAAAD8UhruVwm402lgPBG2Tj-aQEAnz-IOcWBGE2lrVuQgAF6zAAAAgFJAAAA",
    "cachedResultUrl": "https://outlook.office365.com/mail/AQMkAGE3ZTU5MGMzLTFkNGItNGQ5Zi04MDQ1LThmNGFlMTVhYjMwYgAuAAAD8UhruVwm402lgPBG2Tj%2FaQEAnz%2FIOcWBGE2lrVuQgAF6zAAAAgFJAAAA",
    "cachedResultName": "Junk Email"
  },
  "messageId": {
    "__rl": true,
    "mode": "id",
    "value": "={{ $('varID & Category1').item.json.id }}"
  },
  "operation": "move"
}
```

##### Example 2: Microsoft Outlook12
**Source**: `examples/Gmail_and_Email_Automation/Auto Categorise Outlook Emails with AI.json`  
**Workflow**: Auto Categorise Outlook Emails with AI

**Configuration**:
```json
{
  "messageId": {
    "__rl": true,
    "mode": "id",
    "value": "={{ $('varID & Category1').item.json.id }}"
  },
  "operation": "update",
  "updateFields": {
    "categories": "={{ \n [$('varJSON1').first().json.output.category, $('varJSON1').first().json.output.subCategory]\n .filter(item => item && item.trim() !== \"\")\n .map(item => item.charAt(0).toUpperCase() + item.slice(1))\n}}"
  }
}
```

##### Example 3: Microsoft Outlook23
**Source**: `examples/Gmail_and_Email_Automation/Auto Categorise Outlook Emails with AI.json`  
**Workflow**: Auto Categorise Outlook Emails with AI

**Configuration**:
```json
{
  "limit": 1,
  "fields": [
    "flag",
    "from",
    "importance",
    "replyTo",
    "sender",
    "subject",
    "toRecipients",
    "body",
    "categories",
    "isRead"
  ],
  "output": "fields",
  "options": {},
  "filtersUI": {
    "values": {
      "filters": {
        "custom": "flag/flagStatus eq 'notFlagged' and not categories/any()",
        "foldersToInclude": [
          "AQMkAGE3ZTU5MGMzLTFkNGItNGQ5Zi04MDQ1LThmNGFlMTVhYjMwYgAuAAAD8UhruVwm402lgPBG2Tj-aQEAnz-IOcWBGE2lrVuQgAF6zAAAAgEMAAAA"
        ]
      }
    }
  },
  "operation": "getAll"
}
```

##### Example 4: Send the summary by e-mail
**Source**: `examples/Gmail_and_Email_Automation/📈 Receive Daily Market News from FT.com to your Microsoft outlook inbox.json`  
**Workflow**: 📈 Receive Daily Market News from FT.com to your Microsoft outlook inbox

**Credentials**: `{{CREDENTIAL_microsoftOutlookOAuth2Api}}`

**Configuration**:
```json
{
  "subject": "Financial news from today",
  "bodyContent": "=News of the day : \n\n{{ $json.output }}",
  "toRecipients": "",
  "additionalFields": {
    "bodyContentType": "html"
  }
}
```

##### Example 5: Microsoft Outlook
**Source**: `examples/OpenAI_and_LLMs/AI-Powered Candidate Shortlisting Automation for ERPNext.json`  
**Workflow**: AI-Powered Candidate Shortlisting Automation for ERPNext

**Credentials**: `{{CREDENTIAL_microsoftOutlookOAuth2Api}}`

**Configuration**:
```json
{
  "additionalFields": {}
}
```


---

### MicrosoftOutlookTool
**Type**: `n8n-nodes-base.microsoftOutlookTool`  
**Description**: n8n node for microsoftOutlookTool operations.  
**Auth Required**: `microsoftOutlookOAuth2Api`  
**Usage Count**: 1 templates

#### Common Operations/Modes
- `create`

#### Usage Examples

##### Example 1: Create follow-up call
**Source**: `examples/Other_Integrations_and_Use_Cases/Zoom AI Meeting Assistant creates mail summary, ClickUp tasks and follow-up call.json`  
**Workflow**: Zoom AI Meeting Assistant

**Credentials**: `{{CREDENTIAL_microsoftOutlookOAuth2Api}}`

**Configuration**:
```json
{
  "subject": "={{ $fromAI(\"meeting_name\",\"Meeting name\",\"string\") }}",
  "resource": "event",
  "operation": "create",
  "calendarId": {
    "__rl": true,
    "mode": "list",
    "value": "AQMkADAwATNiZmYAZC1jYjE5LWExMzQtMDACLTAwCgBGAAAD1gD8iHcpKEiYQc0w4fCLUgcA-79r8r8ac0aInYGVxRUqCwAAAgEGAAAA-79r8r8ac0aInYGVxRUqCwAAAkH-AAAA",
    "cachedResultName": "Calendar"
  },
  "endDateTime": "={{ $fromAI(\"end_date_time\",\"Date and time of meeting end\",\"string\") }}",
  "startDateTime": "={{ $fromAI(\"start_date_time\",\"Date and time of meeting start\",\"string\") }}",
  "descriptionType": "manual",
  "toolDescription": "=Use tool to create Outlook Calendar Event. Use this tool only when transcript contains information that call should be scheduled.",
  "additionalFields": {
    "timeZone": "Europe/Berlin"
  }
}
```

