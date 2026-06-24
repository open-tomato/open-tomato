---
tags: [n8n, project-management, jira, linear, clickup, pipedrive, crm]
category: project-management
description: Issue trackers and project management platform integrations
---

# Project Management

## Overview
Issue trackers and project management platform integrations.

## Nodes in This Category

---

### Jira
**Type**: `n8n-nodes-base.jira`  
**Description**: Create, update and manage Jira issues, sprints and projects.  
**Auth Required**: `jiraSoftwareCloudApi`  
**Usage Count**: 14 templates

#### Common Operations/Modes
- `getAll`
- `issueAttachment`
- `issueComment`
- `update`

#### Usage Examples

##### Example 1: Create Potentially Malicious Ticket
**Source**: `examples/Gmail_and_Email_Automation/Analyze & Sort Suspicious Email Contents with ChatGPT.json`  
**Workflow**: Analyze & Sort Suspicious Email Contents with ChatGPT

**Credentials**: `{{CREDENTIAL_jiraSoftwareCloudApi}}`

**Configuration**:
```json
{
  "project": {
    "__rl": true,
    "mode": "list",
    "value": "10001",
    "cachedResultName": "Support"
  },
  "summary": "=Potentially Malicious - Phishing Email Reported: \"{{ $('Set Email Variables').item.json.subject }}\"",
  "issueType": {
    "__rl": true,
    "mode": "list",
    "value": "10008",
    "cachedResultName": "Task"
  },
  "additionalFields": {
    "description": "=A phishing email was reported by {{ $('Set Email Variables').item.json.recipient }} with the subject line \"{{ $('Set Email Variables').item.json.subject }}\"\n\\\\\nh2. Here is ChatGPT's analysis of the email:\n{{ $json.message.content.summary }}"
  }
}
```

##### Example 2: Upload Screenshot of Email to Jira
**Source**: `examples/Gmail_and_Email_Automation/Analyze & Sort Suspicious Email Contents with ChatGPT.json`  
**Workflow**: Analyze & Sort Suspicious Email Contents with ChatGPT

**Credentials**: `{{CREDENTIAL_jiraSoftwareCloudApi}}`

**Configuration**:
```json
{
  "issueKey": "={{ $('Set Jira ID').item.json.key }}",
  "resource": "issueAttachment"
}
```

##### Example 3: Get Issue Comments
**Source**: `examples/OpenAI_and_LLMs/Automate Customer Support Issue Resolution using AI Text Classifier.json`  
**Workflow**: Automate Customer Support Issue Resolution using AI Text Classifier

**Credentials**: `{{CREDENTIAL_jiraSoftwareCloudApi}}`

**Configuration**:
```json
{
  "options": {},
  "issueKey": "={{ $json.key }}",
  "resource": "issueComment",
  "operation": "getAll"
}
```

##### Example 4: Close Issue
**Source**: `examples/OpenAI_and_LLMs/Automate Customer Support Issue Resolution using AI Text Classifier.json`  
**Workflow**: Automate Customer Support Issue Resolution using AI Text Classifier

**Credentials**: `{{CREDENTIAL_jiraSoftwareCloudApi}}`

**Configuration**:
```json
{
  "issueKey": "={{ $('Get Issue Metadata').item.json.key }}",
  "operation": "update",
  "updateFields": {
    "statusId": {
      "__rl": true,
      "mode": "list",
      "value": "31",
      "cachedResultName": "Done"
    }
  }
}
```

##### Example 5: Send Reminder
**Source**: `examples/OpenAI_and_LLMs/Automate Customer Support Issue Resolution using AI Text Classifier.json`  
**Workflow**: Automate Customer Support Issue Resolution using AI Text Classifier

**Credentials**: `{{CREDENTIAL_jiraSoftwareCloudApi}}`

**Configuration**:
```json
{
  "comment": "={{ $json.text }}\n(this is an automated message)",
  "options": {},
  "issueKey": "={{ $('Get Issue Metadata').item.json.key }}",
  "resource": "issueComment"
}
```


---

### JiraTool
**Type**: `n8n-nodes-base.jiraTool`  
**Description**: n8n node for jiraTool operations.  
**Auth Required**: `jiraSoftwareCloudApi`  
**Usage Count**: 1 templates

#### Common Operations/Modes
- `getAll`

#### Usage Examples

##### Example 1: Find Simlar Issues
**Source**: `examples/OpenAI_and_LLMs/Automate Customer Support Issue Resolution using AI Text Classifier.json`  
**Workflow**: Automate Customer Support Issue Resolution using AI Text Classifier

**Credentials**: `{{CREDENTIAL_jiraSoftwareCloudApi}}`

**Configuration**:
```json
{
  "limit": 4,
  "options": {
    "jql": "=text ~ \"{{ $fromAI('title', 'the title of the current issue', 'string', '') }}\" AND status IN (\"In Progress\", \"Done\")"
  },
  "operation": "getAll",
  "descriptionType": "manual",
  "toolDescription": "Call this tool to search for similar issues in JIRA."
}
```


---

### Linear
**Type**: `n8n-nodes-base.linear`  
**Description**: Create, update and manage Linear issues and projects.  
**Auth Required**: `linearApi`  
**Usage Count**: 17 templates

#### Common Operations/Modes
- `comment`
- `getAll`
- `update`

#### Usage Examples

##### Example 1: Create Report
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Visual Regression Testing with Apify and AI Vision Model.json`  
**Workflow**: Visual Regression Testing with Apify and AI Vision Model

**Credentials**: `{{CREDENTIAL_linearApi}}`

**Configuration**:
```json
{
  "title": "=Visual Regression Report {{ $now.format('yyyy-MM-dd') }}",
  "teamId": "{{UUID}}",
  "additionalFields": {
    "description": "=Visual Regression Workflow picked up the following changes:\n\n{{\n$json.data.map(row =>\n`### ${row.url}\n${row.output.map(issue =>\n`* **${issue.description}** - expected \"${issue.previous_state}\" but got \"${issue.current_state}\"`\n).join('\\n')}`\n).join('\\n');\n}}"
  }
}
```

##### Example 2: Add a comment to an issue1
**Source**: `examples/Linear/AI-powered research assistant with Linear, Scrapeless, and Claude.json`  
**Workflow**: Build an AI-Powered Research Assistant with Linear + Scrapeless + Claude

**Credentials**: `{{CREDENTIAL_linearApi}}`

**Configuration**:
```json
{
  "comment": "={{ $json.output }}",
  "issueId": "={{ $('Linear Trigger').item.json.data.id }}",
  "resource": "comment",
  "additionalFields": {}
}
```

##### Example 3: 🛠️ Assign to Engineering
**Source**: `examples/Linear/Automatic issue routing in Linear with GPT-4-mini classification.json`  
**Workflow**: Linear Bug Auto-Routing

**Credentials**: `{{CREDENTIAL_linearApi}}`

**Configuration**:
```json
{
  "issueId": "={{ $('⚖️ If (Create or Update)').item.json.data.id }}",
  "operation": "update",
  "updateFields": {
    "teamId": "={{ $json.output }}"
  }
}
```

##### Example 4: Get Existing Issues
**Source**: `examples/Linear/Customer Support Channel and Ticketing System with Slack and Linear.json`  
**Workflow**: Customer Support Channel and Ticketing System with Slack and Linear

**Credentials**: `{{CREDENTIAL_linearApi}}`

**Configuration**:
```json
{
  "operation": "getAll"
}
```

##### Example 5: Create an issue
**Source**: `examples/Linear/Auto-reply & create Linear tickets from Gmail with GPT-5, gotoHuman & human review.json`  
**Workflow**: Auto-reply & create Linear tickets from Gmail with GPT-5, gotoHuman & human review

**Configuration**:
```json
{
  "title": "={{ $json.output.title }}",
  "teamId": "{{UUID}}",
  "additionalFields": {
    "priorityId": "={{ $json.output.priority }}",
    "description": "={{ $json.output.description }}"
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

### ClickUp
**Type**: `n8n-nodes-base.clickUp`  
**Description**: n8n node for clickUp operations.  
**Auth Required**: `clickUpOAuth2Api`  
**Usage Count**: 1 templates

#### Usage Examples

##### Example 1: ClickUp
**Source**: `examples/Other_Integrations_and_Use_Cases/Zoom AI Meeting Assistant creates mail summary, ClickUp tasks and follow-up call.json`  
**Workflow**: Zoom AI Meeting Assistant

**Credentials**: `{{CREDENTIAL_clickUpOAuth2Api}}`

**Configuration**:
```json
{
  "list": "901207046581",
  "name": "={{ $json.name }}",
  "team": "9012366821",
  "space": "90122025710",
  "folder": "90123813376",
  "authentication": "oAuth2",
  "additionalFields": {
    "content": "={{ $json.description }}",
    "dueDate": "={{ $json.due_date }}"
  }
}
```


---

### Pipedrive
**Type**: `n8n-nodes-base.pipedrive`  
**Description**: n8n node for pipedrive operations.  
**Auth Required**: `pipedriveApi`  
**Usage Count**: 4 templates

#### Common Operations/Modes
- `get`
- `note`
- `search`

#### Usage Examples

##### Example 1: Search Person in CRM
**Source**: `examples/Other_Integrations_and_Use_Cases/Qualify replies from Pipedrive persons with AI.json`  
**Workflow**: Qualify replies from Pipedrive persons with AI

**Credentials**: `{{CREDENTIAL_pipedriveApi}}`

**Configuration**:
```json
{
  "term": "={{ $json.from.value[0].address }}",
  "limit": 1,
  "resource": "person",
  "operation": "search",
  "additionalFields": {
    "includeFields": ""
  }
}
```

##### Example 2: Get person from CRM
**Source**: `examples/Other_Integrations_and_Use_Cases/Qualify replies from Pipedrive persons with AI.json`  
**Workflow**: Qualify replies from Pipedrive persons with AI

**Credentials**: `{{CREDENTIAL_pipedriveApi}}`

**Configuration**:
```json
{
  "personId": "={{ $json.id }}",
  "resource": "person",
  "operation": "get",
  "resolveProperties": true
}
```

##### Example 3: Create deal in CRM
**Source**: `examples/Other_Integrations_and_Use_Cases/Qualify replies from Pipedrive persons with AI.json`  
**Workflow**: Qualify replies from Pipedrive persons with AI

**Credentials**: `{{CREDENTIAL_pipedriveApi}}`

**Configuration**:
```json
{
  "title": "={{ $('Get person from CRM').item.json.Name }} Deal",
  "additionalFields": {}
}
```

##### Example 4: Pipedrive - Create a Note with OpenAI output
**Source**: `examples/Slack/Enrich Pipedrive_s Organization Data with OpenAI GPT-4o & Notify it in Slack.json`  
**Workflow**: piepdrive-test

**Credentials**: `{{CREDENTIAL_pipedriveApi}}`

**Configuration**:
```json
{
  "content": "={{ $json.message.content }}",
  "resource": "note",
  "additionalFields": {
    "org_id": "={{ $('Pipedrive Trigger - An Organization is created').item.json.meta.id }}"
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

