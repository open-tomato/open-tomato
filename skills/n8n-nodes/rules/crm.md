---
tags: [n8n, crm, hr, erp, zendesk, bamboohr, woocommerce, ecommerce, hubspot]
category: crm
description: Customer relationship management, HR systems, and e-commerce platforms
---

# CRM & HR Platforms

## Overview
Customer relationship management, HR systems, and e-commerce platforms.

## Nodes in This Category

---

### ErpNext
**Type**: `n8n-nodes-base.erpNext`  
**Description**: n8n node for erpNext operations.  
**Auth Required**: `erpNextApi`  
**Usage Count**: 3 templates

#### Common Operations/Modes
- `get`
- `update`

#### Usage Examples

##### Example 1: ERPNext - Reject if Resume not Attached
**Source**: `examples/OpenAI_and_LLMs/AI-Powered Candidate Shortlisting Automation for ERPNext.json`  
**Workflow**: AI-Powered Candidate Shortlisting Automation for ERPNext

**Credentials**: `{{CREDENTIAL_erpNextApi}}`

**Configuration**:
```json
{
  "docType": "Job%20Applicant",
  "operation": "update",
  "properties": {
    "customProperty": [
      {
        "field": "status",
        "value": "Rejected"
      }
    ]
  },
  "documentName": "={{ $('ApplicantData').item.json.body.name }}"
}
```

##### Example 2: ERPNext - Hold Applicant
**Source**: `examples/OpenAI_and_LLMs/AI-Powered Candidate Shortlisting Automation for ERPNext.json`  
**Workflow**: AI-Powered Candidate Shortlisting Automation for ERPNext

**Credentials**: `{{CREDENTIAL_erpNextApi}}`

**Configuration**:
```json
{
  "docType": "Job%20Applicant",
  "operation": "update",
  "properties": {
    "customProperty": [
      {
        "field": "status",
        "value": "Hold"
      }
    ]
  },
  "documentName": "={{ $('ApplicantData').item.json.body.name }}"
}
```

##### Example 3: Get Job Opening
**Source**: `examples/OpenAI_and_LLMs/AI-Powered Candidate Shortlisting Automation for ERPNext.json`  
**Workflow**: AI-Powered Candidate Shortlisting Automation for ERPNext

**Credentials**: `{{CREDENTIAL_erpNextApi}}`

**Configuration**:
```json
{
  "docType": "Job%20Opening",
  "operation": "get",
  "documentName": "={{ $('ApplicantData').item.json.body.Job_opening }}"
}
```


---

### Zendesk
**Type**: `n8n-nodes-base.zendesk`  
**Description**: n8n node for zendesk operations.  
**Auth Required**: `zendeskApi`  
**Usage Count**: 2 templates

#### Common Operations/Modes
- `getAll`
- `update`

#### Usage Examples

##### Example 1: Get all Zendesk Tickets
**Source**: `examples/Other_Integrations_and_Use_Cases/Automate SIEM Alert Enrichment with MITRE ATT&CK, Qdrant & Zendesk in n8n.json`  
**Workflow**: Automate SIEM Alert Enrichment with MITRE ATT&CK, Qdrant & Zendesk in n8n

**Credentials**: `{{CREDENTIAL_zendeskApi}}`

**Configuration**:
```json
{
  "options": {},
  "operation": "getAll"
}
```

##### Example 2: Update Zendesk with Mitre Data
**Source**: `examples/Other_Integrations_and_Use_Cases/Automate SIEM Alert Enrichment with MITRE ATT&CK, Qdrant & Zendesk in n8n.json`  
**Workflow**: Automate SIEM Alert Enrichment with MITRE ATT&CK, Qdrant & Zendesk in n8n

**Credentials**: `{{CREDENTIAL_zendeskApi}}`

**Configuration**:
```json
{
  "operation": "update",
  "updateFields": {
    "internalNote": "=Summary: {{ $json.output.ttp_identification.alert_summary }}\n\n",
    "customFieldsUi": {
      "customFieldsValues": [
        {
          "value": "={{ $json.output.ttp_identification.mitre_attack_ttps[0].technique_id }}"
        },
        {
          "value": "={{ $json.output.ttp_identification.mitre_attack_ttps[0].tactic }}"
        }
      ]
    }
  }
}
```


---

### BambooHr
**Type**: `n8n-nodes-base.bambooHr`  
**Description**: n8n node for bambooHr operations.  
**Auth Required**: `bambooHrApi`  
**Usage Count**: 5 templates

#### Common Operations/Modes
- `download`
- `getAll`

#### Usage Examples

##### Example 1: GET all files
**Source**: `examples/HR_and_Recruitment/BambooHR AI-Powered Company Policies and Benefits Chatbot.json`  
**Workflow**: BambooHR AI-Powered Company Policies and Benefits Chatbot

**Credentials**: `{{CREDENTIAL_bambooHrApi}}`

**Configuration**:
```json
{
  "resource": "file",
  "operation": "getAll",
  "returnAll": true,
  "simplifyOutput": false
}
```

##### Example 2: Download file from BambooHR
**Source**: `examples/HR_and_Recruitment/BambooHR AI-Powered Company Policies and Benefits Chatbot.json`  
**Workflow**: BambooHR AI-Powered Company Policies and Benefits Chatbot

**Credentials**: `{{CREDENTIAL_bambooHrApi}}`

**Configuration**:
```json
{
  "fileId": "={{ $json.id }}",
  "resource": "file",
  "operation": "download"
}
```

##### Example 3: GET all employees
**Source**: `examples/HR_and_Recruitment/BambooHR AI-Powered Company Policies and Benefits Chatbot.json`  
**Workflow**: BambooHR AI-Powered Company Policies and Benefits Chatbot

**Credentials**: `{{CREDENTIAL_bambooHrApi}}`

**Configuration**:
```json
{
  "operation": "getAll",
  "returnAll": true
}
```

##### Example 4: GET all employees (second path)
**Source**: `examples/HR_and_Recruitment/BambooHR AI-Powered Company Policies and Benefits Chatbot.json`  
**Workflow**: BambooHR AI-Powered Company Policies and Benefits Chatbot

**Credentials**: `{{CREDENTIAL_bambooHrApi}}`

**Configuration**:
```json
{
  "operation": "getAll",
  "returnAll": true
}
```

##### Example 5: Retrieve all employees
**Source**: `examples/HR_and_Recruitment/BambooHR AI-Powered Company Policies and Benefits Chatbot.json`  
**Workflow**: BambooHR AI-Powered Company Policies and Benefits Chatbot

**Credentials**: `{{CREDENTIAL_bambooHrApi}}`

**Configuration**:
```json
{
  "operation": "getAll",
  "returnAll": true
}
```


---

### HumanticAi
**Type**: `n8n-nodes-base.humanticAi`  
**Description**: n8n node for humanticAi operations.  
**Auth Required**: `humanticAiApi`  
**Usage Count**: 3 templates

#### Common Operations/Modes
- `get`
- `update`

#### Usage Examples

##### Example 1: Humantic AI
**Source**: `examples/Other_Integrations_and_Use_Cases/Create, update, and get a profile in Humantic AI.json`  
**Workflow**: Create, update, and get a profile in Humantic AI

**Credentials**: `{{CREDENTIAL_humanticAiApi}}`

**Configuration**:
```json
{
  "userId": "https://www.linkedin.com/in/harshil1712/"
}
```

##### Example 2: Humantic AI1
**Source**: `examples/Other_Integrations_and_Use_Cases/Create, update, and get a profile in Humantic AI.json`  
**Workflow**: Create, update, and get a profile in Humantic AI

**Credentials**: `{{CREDENTIAL_humanticAiApi}}`

**Configuration**:
```json
{
  "userId": "={{$node[\"Humantic AI\"].json[\"results\"][\"userid\"]}}",
  "operation": "update",
  "sendResume": true
}
```

##### Example 3: Humantic AI2
**Source**: `examples/Other_Integrations_and_Use_Cases/Create, update, and get a profile in Humantic AI.json`  
**Workflow**: Create, update, and get a profile in Humantic AI

**Credentials**: `{{CREDENTIAL_humanticAiApi}}`

**Configuration**:
```json
{
  "userId": "={{$node[\"Humantic AI\"].json[\"results\"][\"userid\"]}}",
  "options": {
    "persona": [
      "hiring"
    ]
  },
  "operation": "get"
}
```


---

### WooCommerce
**Type**: `n8n-nodes-base.wooCommerce`  
**Description**: n8n node for wooCommerce operations.  
**Auth Required**: `wooCommerceApi`  
**Usage Count**: 1 templates

#### Common Operations/Modes
- `getAll`

#### Usage Examples

##### Example 1: WooCommerce - Get User
**Source**: `examples/OpenAI_and_LLMs/AI-powered WooCommerce Support-Agent.json`  
**Workflow**: AI-powered WooCommerce Support-Agent

**Credentials**: `{{CREDENTIAL_wooCommerceApi}}`

**Configuration**:
```json
{
  "limit": 1,
  "filters": {
    "email": "={{ $json.email }}"
  },
  "resource": "customer",
  "operation": "getAll"
}
```


---

---

### HubSpot
**Type**: `n8n-nodes-base.hubspot`
**Description**: Create and manage HubSpot contacts, deals, engagements, companies, and pipelines via the HubSpot CRM API.
**Auth Required**: `hubspotOAuth2Api`, `hubspotAppToken`, or `hubspotDeveloperApi`
**Usage Count**: 4 templates

#### Common Operations/Modes
- `contact` — create, update, get contacts
- `deal` — create deals and associate with contacts
- `engagement` — create tasks, calls, emails linked to contacts

#### Usage Examples

##### Example 1: Create HubSpot Contact
**Source**: `examples/OpenAI_and_LLMs/lemlist __ GPT-3_ Supercharge your sales workflows.json`
**Workflow**: lemlist + GPT-3: Supercharge your sales workflows

**Credentials**: `{{CREDENTIAL_hubspotOAuth2Api}}`

**Configuration**:
```json
{
  "email": "={{ $json.leadEmail }}",
  "resource": "contact",
  "authentication": "oAuth2",
  "additionalFields": {
    "lastName": "={{ $json.leadLastName }}",
    "firstName": "={{ $json.leadFirstName }}"
  }
}
```

##### Example 2: Create HubSpot Deal
**Source**: `examples/OpenAI_and_LLMs/lemlist __ GPT-3_ Supercharge your sales workflows.json`
**Workflow**: lemlist + GPT-3: Supercharge your sales workflows

**Credentials**: `{{CREDENTIAL_hubspotOAuth2Api}}`

**Configuration**:
```json
{
  "stage": "{{PIPELINE_STAGE_ID}}",
  "authentication": "oAuth2",
  "additionalFields": {
    "dealName": "=New Deal with {{ $json.contactName }}",
    "associatedVids": "={{ $json.contactId }}"
  }
}
```

##### Example 3: Create Engagement (Task)
**Source**: `examples/OpenAI_and_LLMs/lemlist __ GPT-3_ Supercharge your sales workflows.json`
**Workflow**: lemlist + GPT-3: Supercharge your sales workflows

**Credentials**: `{{CREDENTIAL_hubspotOAuth2Api}}`

**Configuration**:
```json
{
  "type": "task",
  "resource": "engagement",
  "authentication": "oAuth2",
  "metadata": {
    "subject": "=OOO - Follow up with {{ $json.contactFirstName }} {{ $json.contactLastName }}"
  },
  "additionalFields": {
    "associations": {
      "contactIds": "={{ $json.contactId }}"
    }
  }
}
```

---

### WooCommerceTool
**Type**: `n8n-nodes-base.wooCommerceTool`  
**Description**: n8n node for wooCommerceTool operations.  
**Auth Required**: `wooCommerceApi`  
**Usage Count**: 1 templates

#### Common Operations/Modes
- `getAll`

#### Usage Examples

##### Example 1: personal_shopper
**Source**: `examples/OpenAI_and_LLMs/Personal Shopper Chatbot for WooCommerce with RAG using Google Drive and openAI.json`  
**Workflow**: OpenAI Personal Shopper with RAG and WooCommerce

**Credentials**: `{{CREDENTIAL_wooCommerceApi}}`

**Configuration**:
```json
{
  "options": {
    "sku": "={{ $('Information Extractor').item.json.output.SKU }}",
    "search": "={{ $('Information Extractor').item.json.output.keyword }}",
    "maxPrice": "={{ $('Information Extractor').item.json.output.price_max }}",
    "minPrice": "={{ $('Information Extractor').item.json.output.price_min }}",
    "stockStatus": "instock"
  },
  "operation": "getAll"
}
```

