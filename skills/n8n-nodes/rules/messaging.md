---
tags: [n8n, messaging, discord, slack, telegram, whatsapp, twilio]
category: messaging
description: Send and receive messages via Discord, Slack, Telegram, WhatsApp, and SMS
---

# Messaging Platforms

## Overview
Send and receive messages via Discord, Slack, Telegram, WhatsApp, and SMS.

## Nodes in This Category

---

### Discord
**Type**: `n8n-nodes-base.discord`  
**Description**: Sends messages to Discord channels or DMs via bot token or webhook.  
**Auth Required**: `discordBotApi`, `discordWebhookApi`  
**Usage Count**: 6 templates

#### Common Operations/Modes
- `message`

#### Usage Examples

##### Example 1: User Success Dept
**Source**: `examples/Discord/Discord AI-powered bot.json`  
**Workflow**: Discord AI bot

**Configuration**:
```json
{
  "text": "={{ $json.gpt_reply.instruction }}",
  "options": {},
  "webhookUri": "https://discord.com/api/webhooks/<YOUR WEBHOOK HERE>"
}
```

##### Example 2: Discord
**Source**: `examples/Discord/Send daily translated Calvin and Hobbes Comics to Discord.json`  
**Workflow**: Send daily translated Calvin and Hobbes Comics to Discord

**Credentials**: `{{CREDENTIAL_discordWebhookApi}}`

**Configuration**:
```json
{
  "content": "=Daily Cartoon ({{ $('param').item.json.year }}/{{ $('param').item.json.month }}/{{ $('param').item.json.day }})\n{{ $('Information Extractor').item.json.output.cartoon_image }}\n\n{{ $json.content }}\n",
  "options": {},
  "authentication": "webhook"
}
```

##### Example 3: Discord
**Source**: `examples/Instagram_Twitter_Social_Media/Speed Up Social Media Banners With BannerBear.com.json`  
**Workflow**: Speed Up Social Media Banners With BannerBear.com

**Credentials**: `{{CREDENTIAL_discordBotApi}}`

**Configuration**:
```json
{
  "files": {
    "values": [
      {}
    ]
  },
  "content": "=📅 New Event Alert! {{ $('Set Parameters').item.json.title }} being held at {{ $('Set Parameters').item.json.location }} on the {{ $('Set Parameters').item.json.date }}! Don't miss it!",
  "guildId": {
    "__rl": true,
    "mode": "list",
    "value": "1248678443432808509",
    "cachedResultUrl": "https://discord.com/channels/1248678443432808509",
    "cachedResultName": "Datamoldxyz"
  },
  "options": {},
  "resource": "message",
  "channelId": {
    "__rl": true,
    "mode": "list",
    "value": "1248678443432808512",
    "cachedResultUrl": "https://discord.com/channels/1248678443432808509/1248678443432808512",
    "cachedResultName": "general"
  }
}
```

##### Example 4: IT Dept
**Source**: `examples/Discord/Discord AI-powered bot.json`  
**Workflow**: Discord AI bot

**Configuration**:
```json
{
  "text": "={{ $json.gpt_reply.instruction }}",
  "options": {},
  "webhookUri": "https://discord.com/api/webhooks/<YOUR WEBHOOK HERE>"
}
```

##### Example 5: Helpdesk
**Source**: `examples/Discord/Discord AI-powered bot.json`  
**Workflow**: Discord AI bot

**Configuration**:
```json
{
  "text": "={{ $json.gpt_reply.instruction }}",
  "options": {},
  "webhookUri": "https://discord.com/api/webhooks/<YOUR WEBHOOK HERE>"
}
```


---

### Slack
**Type**: `n8n-nodes-base.slack`  
**Description**: Posts messages to Slack channels, DMs, and threads. Supports blocks, attachments, and file uploads.  
**Auth Required**: `slackApi`, `slackOAuth2Api`  
**Usage Count**: 31 templates

#### Common Operations/Modes
- `delete`
- `search`
- `sendAndWait`

#### Usage Examples

##### Example 1: Send alert to Slack
**Source**: `examples/Gmail_and_Email_Automation/Classify lemlist replies using OpenAI and automate reply handling.json`  
**Workflow**: Classify lemlist replies using OpenAI and automate reply handling

**Configuration**:
```json
{
  "text": "=",
  "select": "channel",
  "blocksUi": "={\n\t\"blocks\": [\n\t\t{\n\t\t\t\"type\": \"section\",\n\t\t\t\"text\": {\n\t\t\t\t\"type\": \"mrkdwn\",\n\t\t\t\t\"text\": \":raised_hands: New reply in lemlist!\\n\"\n\t\t\t}\n\t\t},\n\t\t{\n\t\t\t\"type\": \"section\",\n\t\t\t\"fields\": [\n\t\t\t\t{\n\t\t\t\t\t\"type\": \"mrkdwn\",\n\t\t\t\t\t\"text\": \"*Categorized as:*\\n{{ $json[\"output\"][\"category\"] }}\"\n\t\t\t\t},\n\t\t\t\t{\n\t\t\t\t\t\"type\": \"mrkdwn\",\n\t\t\t\t\t\"text\": \"*Campaign:*\\n<https://app.lemlist.com/teams/{{ $json[\"teamId\"] }}/reports/campaigns/{{ $json[\"campaignId\"] }}|{{ $json[\"campaignName\"] }}>\"\n\t\t\t\t},\n\t\t\t\t{\n\t\t\t\t\t\"type\": \"mrkdwn\",\n\t\t\t\t\t\"text\": \"*Sender Email:*\\n{{ $json[\"sendUserEmail\"] }}\"\n\t\t\t\t},\n\t\t\t\t{\n\t\t\t\t\t\"type\": \"mrkdwn\",\n\t\t\t\t\t\"text\": \"*Lead Email:*\\n{{ $json[\"leadEmail\"] }}\"\n\t\t\t\t},\n\t\t\t\t{\n\t\t\t\t\t\"type\": \"mrkdwn\",\n\t\t\t\t\t\"text\": \"*Linkedin URL:*\\n{{ $json[\"linkedinUrl\"] }}\"\n\t\t\t\t}\n\t\t\t]\n\t\t},\n\t\t{\n\t\t\t\"type\": \"section\",\n\t\t\t\"text\": {\n\t\t\t\t\"type\": \"mrkdwn\",\n\t\t\t\t\"text\": \"*Reply preview*:\\n{{ JSON.stringify($json[\"textClean\"]).replace(/^\"(.+(?=\"$))\"$/, '$1').substring(0, 100) }}\"\n\t\t\t}\n\t\t}\n\t]\n}",
  "channelId": {
    "__rl": true,
    "mode": "name",
    "value": "automated_outbound_replies"
  },
  "messageType": "block",
  "otherOptions": {
    "botProfile": {
      "imageValues": {
        "icon_emoji": ":fire:",
        "profilePhotoType": "emoji"
      }
    },
    "unfurl_links": false,
    "includeLinkToWorkflow": false
  }
}
```

##### Example 2: Notify in Slack
**Source**: `examples/Linear/Classify new bugs in Linear with OpenAI's GPT-4 and move them to the right team.json`  
**Workflow**: Classify new bugs in Linear with OpenAI's GPT-4 and move them to the right team

**Credentials**: `{{CREDENTIAL_slackApi}}`

**Configuration**:
```json
{
  "text": "The AI was not able to identify a fitting team for a bug",
  "select": "channel",
  "channelId": {
    "__rl": true,
    "mode": "name",
    "value": "={{ $('Set me up').first().json.slackChannel }}"
  },
  "otherOptions": {}
}
```

##### Example 3: Slack
**Source**: `examples/Linear/Customer Support Channel and Ticketing System with Slack and Linear.json`  
**Workflow**: Customer Support Channel and Ticketing System with Slack and Linear

**Credentials**: `{{CREDENTIAL_slackApi}}`

**Configuration**:
```json
{
  "limit": 10,
  "query": "in:#n8n-tickets has::ticket:",
  "options": {},
  "operation": "search"
}
```

##### Example 4: Slack
**Source**: `examples/Notion/Add positive feedback messages to a table in Notion.json`  
**Workflow**: Add positive feedback messages to a table in Notion

**Credentials**: `{{CREDENTIAL_slackApi}}`

**Configuration**:
```json
{
  "channel": "general",
  "blocksUi": {
    "blocksValues": []
  },
  "attachments": [
    {
      "text": "={{$node[\"Typeform Trigger\"].json[\"Any suggestions for us? \"]}}",
      "title": "={{$node[\"Typeform Trigger\"].json[\"Name\"]}} {{$node[\"Google Cloud Natural Language\"].json[\"documentSentiment\"][\"score\"]}}"
    }
  ],
  "otherOptions": {}
}
```

##### Example 5: Slack - Notify Channel
**Source**: `examples/OpenAI_and_LLMs/AI-Generated Summary Block for WordPress Posts.json`  
**Workflow**: AI-Generated Summary Block for WordPress Posts - with OpenAI, WordPress, Google Sheets & Slack

**Credentials**: `{{CREDENTIAL_slackOAuth2Api}}`

**Configuration**:
```json
{
  "text": "=📄🔔 *New WordPress Post Updated with AI Summary*\n\nThe post *{{ $('Set fields - Prepare data for Gsheets & Slack').item.json.title }}* has been updated with an AI-generated summary at the top of the article. \nYou can view it here: {{ $('Set fields - Prepare data for Gsheets & Slack').item.json.post_link }}\n\n• *Post ID*: {{ $('Set fields - Prepare data for Gsheets & Slack').item.json.post_id }}\n• *Edit Link*: {{ $('Set fields - Prepare data for Gsheets & Slack').item.json.edit_link }}\n",
  "select": "channel",
  "channelId": {
    "__rl": true,
    "mode": "list",
    "value": "C08AN5DJLCT",
    "cachedResultName": "wp-posts-ai"
  },
  "otherOptions": {
    "mrkdwn": true
  },
  "authentication": "oAuth2"
}
```

**Prompt/System Message**:
```
=📄🔔 *New WordPress Post Updated with AI Summary*

The post *{{ $('Set fields - Prepare data for Gsheets & Slack').item.json.title }}* has been updated with an AI-generated summary at the top of the article. 
You can view it here: {{ $('Set fields - Prepare data for Gsheets & Slack').item.json.post_link }}

• *Post ID*: {{ $('Set fields - Prepare data for Gsheets & Slack').item.json.post_id }}
• *Edit Link*: {{ $('Set fields - Prepare data for Gsheets & Slack').item.json.edit_link }}

```


---

### Telegram
**Type**: `n8n-nodes-base.telegram`  
**Description**: Sends messages, photos, documents and stickers via the Telegram Bot API.  
**Auth Required**: `telegramApi`  
**Usage Count**: 86 templates

#### Common Operations/Modes
- `chat`
- `deleteMessage`
- `file`
- `sendAudio`
- `sendChatAction`
- `sendDocument`
- `sendPhoto`

#### Usage Examples

##### Example 1: Telegram
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Create a Google Analytics Data Report with AI and sent it to E-Mail and Telegram.json`  
**Workflow**: Google Analytics: Weekly Report

**Credentials**: `{{CREDENTIAL_telegramApi}}`

**Configuration**:
```json
{
  "text": "={{ $json.message.content }}",
  "chatId": "1810565648",
  "additionalFields": {}
}
```

##### Example 2: SendTyping
**Source**: `examples/Google_Drive_and_Google_Sheets/Chat with your event schedule from Google Sheets in Telegram.json`  
**Workflow**: Telegram-bot AI Da Nang

**Credentials**: `{{CREDENTIAL_telegramApi}}`

**Configuration**:
```json
{
  "chatId": "={{ $('telegramInput').item.json.message.chat.id }}",
  "operation": "sendChatAction"
}
```

##### Example 3: Telegram1
**Source**: `examples/HR_and_Recruitment/HR & IT Helpdesk Chatbot with Audio Transcription.json`  
**Workflow**: HR & IT Helpdesk Chatbot with Audio Transcription

**Credentials**: `{{CREDENTIAL_telegramApi}}`

**Configuration**:
```json
{
  "fileId": "={{ $json.message.voice.file_id }}",
  "resource": "file"
}
```

##### Example 4: Telegram
**Source**: `examples/OpenAI_and_LLMs/⚡AI-Powered YouTube Video Summarization & Analysis.json`  
**Workflow**: ⚡AI-Powered YouTube Video Summarization & Analysis

**Configuration**:
```json
{
  "text": "={{ $json.title }}\n{{ $json.youtubeUrl }}",
  "additionalFields": {
    "parse_mode": "HTML",
    "appendAttribution": false
  }
}
```

##### Example 5: Send PDF to the user
**Source**: `examples/PDF_and_Document_Processing/Extract data from resume and create PDF with Gotenberg.json`  
**Workflow**: Extract data from resume and create PDF with Gotenberg

**Credentials**: `{{CREDENTIAL_telegramApi}}`

**Configuration**:
```json
{
  "chatId": "={{ $('Telegram trigger').item.json[\"message\"][\"chat\"][\"id\"] }}",
  "operation": "sendDocument",
  "binaryData": true,
  "additionalFields": {
    "fileName": "={{ $('Set parsed fileds').item.json[\"personal_info\"][\"name\"].toLowerCase().replace(' ', '-') }}.pdf"
  }
}
```


---

### TelegramTool
**Type**: `n8n-nodes-base.telegramTool`  
**Description**: n8n node for telegramTool operations.  
**Auth Required**: `telegramApi`  
**Usage Count**: 1 templates

#### Common Operations/Modes
- `sendDocument`

#### Usage Examples

##### Example 1: Send back an image
**Source**: `examples/Telegram/Agentic Telegram AI bot with with LangChain nodes and new tools.json`  
**Workflow**: Agentic Telegram AI bot with LangChain nodes and new tools

**Credentials**: `{{CREDENTIAL_telegramApi}}`

**Configuration**:
```json
{
  "file": "={{ $fromAI(\"url\", \"a valid url of an image\", \"string\", \" \") }}",
  "chatId": "={{ $('Listen for incoming events').first().json.message.from.id }}",
  "operation": "sendDocument",
  "additionalFields": {}
}
```


---

### WhatsApp
**Type**: `n8n-nodes-base.whatsApp`  
**Description**: Sends WhatsApp messages via the Meta Cloud API.  
**Auth Required**: `whatsAppApi`  
**Usage Count**: 11 templates

#### Common Operations/Modes
- `mediaUrlGet`
- `send`

#### Usage Examples

##### Example 1: WhatsApp Business Cloud
**Source**: `examples/OpenAI_and_LLMs/AI Fitness Coach Strava Data Analysis and Personalized Training Insights.json`  
**Workflow**: AI Fitness Coach Strava Data Analysis and Personalized Training Insights

**Credentials**: `{{CREDENTIAL_whatsAppApi}}`

**Configuration**:
```json
{
  "operation": "send",
  "requestOptions": {},
  "additionalFields": {}
}
```

##### Example 2: WhatsApp Business Cloud
**Source**: `examples/WhatsApp/Automate Sales Meeting Prep with AI & APIFY Sent To WhatsApp.json`  
**Workflow**: Automate Sales Meeting Prep with AI & APIFY Sent To WhatsApp

**Credentials**: `{{CREDENTIAL_whatsAppApi}}`

**Configuration**:
```json
{
  "textBody": "={{ $json.text }}",
  "operation": "send",
  "phoneNumberId": "477115632141067",
  "requestOptions": {},
  "additionalFields": {},
  "recipientPhoneNumber": "44123456789"
}
```

##### Example 3: Get Audio URL
**Source**: `examples/WhatsApp/Respond to WhatsApp Messages with AI Like a Pro!.json`  
**Workflow**: Respond to WhatsApp Messages with AI Like a Pro!

**Credentials**: `{{CREDENTIAL_whatsAppApi}}`

**Configuration**:
```json
{
  "resource": "media",
  "operation": "mediaUrlGet",
  "mediaGetId": "={{ $json.audio.id }}",
  "requestOptions": {}
}
```

##### Example 4: WhatsApp Business Cloud
**Source**: `examples/OpenAI_and_LLMs/AI-Powered Candidate Shortlisting Automation for ERPNext.json`  
**Workflow**: AI-Powered Candidate Shortlisting Automation for ERPNext

**Credentials**: `{{CREDENTIAL_whatsAppApi}}`

**Configuration**:
```json
{
  "operation": "send",
  "requestOptions": {},
  "additionalFields": {}
}
```

##### Example 5: Reply To User
**Source**: `examples/WhatsApp/Building Your First WhatsApp Chatbot.json`  
**Workflow**: Building Your First WhatsApp Chatbot

**Credentials**: `{{CREDENTIAL_whatsAppApi}}`

**Configuration**:
```json
{
  "textBody": "={{ $json.output }}",
  "operation": "send",
  "phoneNumberId": "477115632141067",
  "requestOptions": {},
  "additionalFields": {
    "previewUrl": false
  },
  "recipientPhoneNumber": "={{ $('WhatsApp Trigger').item.json.messages[0].from }}"
}
```


---

### Mattermost
**Type**: `n8n-nodes-base.mattermost`  
**Description**: n8n node for mattermost operations.  
**Auth Required**: `mattermostApi`  
**Usage Count**: 2 templates

#### Usage Examples

##### Example 1: Mattermost
**Source**: `examples/Other_Integrations_and_Use_Cases/Analyze feedback and send a message on Mattermost.json`  
**Workflow**: Analyze the sentiment of feedback and send a message on Mattermost

**Credentials**: `{{CREDENTIAL_mattermostApi}}`

**Configuration**:
```json
{
  "message": "=You got a new feedback with a score of {{$node[\"Google Cloud Natural Language\"].json[\"documentSentiment\"][\"score\"]}}. Here is what it says:{{$node[\"Typeform Trigger\"].json[\"What did you think about the event?\"]}}",
  "channelId": "4h1bz64cyifwxnzojkzh8hxh4a",
  "attachments": [],
  "otherOptions": {}
}
```

**Prompt/System Message**:
```
=You got a new feedback with a score of {{$node["Google Cloud Natural Language"].json["documentSentiment"]["score"]}}. Here is what it says:{{$node["Typeform Trigger"].json["What did you think about the event?"]}}
```

##### Example 2: Mattermost
**Source**: `examples/Other_Integrations_and_Use_Cases/Analyze feedback using AWS Comprehend and send it to a Mattermost channel.json`  
**Workflow**: Analyze feedback using AWS Comprehend and send it to a Mattermost channel

**Credentials**: `{{CREDENTIAL_mattermostApi}}`

**Configuration**:
```json
{
  "message": "=You got new feedback with a score of {{$json[\"SentimentScore\"][\"Negative\"]}}. Here is what it says:{{$node[\"Typeform Trigger\"].json[\"What did you think about the event?\"]}}",
  "channelId": "h7cxrd1cefr13x689enzyw7xhc",
  "attachments": [],
  "otherOptions": {}
}
```

**Prompt/System Message**:
```
=You got new feedback with a score of {{$json["SentimentScore"]["Negative"]}}. Here is what it says:{{$node["Typeform Trigger"].json["What did you think about the event?"]}}
```


---

### Twilio
**Type**: `n8n-nodes-base.twilio`  
**Description**: Sends SMS, MMS and makes voice calls via Twilio.  
**Auth Required**: `twilioApi`  
**Usage Count**: 4 templates

#### Usage Examples

##### Example 1: Send Reply
**Source**: `examples/Other_Integrations_and_Use_Cases/Enhance Customer Chat by Buffering Messages with Twilio and Redis.json`  
**Workflow**: Enhance Customer Chat by Buffering Messages with Twilio and Redis

**Credentials**: `{{CREDENTIAL_twilioApi}}`

**Configuration**:
```json
{
  "to": "={{ $('Twilio Trigger').item.json.From }}",
  "from": "={{ $('Twilio Trigger').item.json.To }}",
  "message": "={{ $json.output }}",
  "options": {}
}
```

##### Example 2: Send Follow Up Message
**Source**: `examples/Other_Integrations_and_Use_Cases/Handling Appointment Leads and Follow-up With Twilio, Cal.com and AI.json`  
**Workflow**: Handling Appointment Leads and Follow-up With Twilio, Cal.com and AI

**Credentials**: `{{CREDENTIAL_twilioApi}}`

**Configuration**:
```json
{
  "to": "={{ $('Find Follow-Up Candidates').item.json.session_id }}",
  "from": "={{ $('Find Follow-Up Candidates').item.json.twilio_service_number }}",
  "message": "={{ $('Generate Follow Up Message').item.json.text }}\nReply STOP to stop recieving these messages.",
  "options": {}
}
```

**Prompt/System Message**:
```
={{ $('Generate Follow Up Message').item.json.text }}
Reply STOP to stop recieving these messages.
```

##### Example 3: Send Reply
**Source**: `examples/Other_Integrations_and_Use_Cases/Handling Appointment Leads and Follow-up With Twilio, Cal.com and AI.json`  
**Workflow**: Handling Appointment Leads and Follow-up With Twilio, Cal.com and AI

**Credentials**: `{{CREDENTIAL_twilioApi}}`

**Configuration**:
```json
{
  "to": "={{ $('Twilio Trigger').item.json.From }}",
  "from": "={{ $('Twilio Trigger').item.json.To }}",
  "message": "={{ $('Appointment Scheduling Agent').item.json.output.reply }}",
  "options": {}
}
```

##### Example 4: Send Confirmation
**Source**: `examples/Other_Integrations_and_Use_Cases/Handling Appointment Leads and Follow-up With Twilio, Cal.com and AI.json`  
**Workflow**: Handling Appointment Leads and Follow-up With Twilio, Cal.com and AI

**Credentials**: `{{CREDENTIAL_twilioApi}}`

**Configuration**:
```json
{
  "to": "={{ $('Twilio Trigger').item.json.From }}",
  "from": "={{ $('Twilio Trigger').item.json.To }}",
  "message": "Thank you. You won't receive any more messages from us!",
  "options": {}
}
```

