---
tags: [n8n, devops, ssh, shell, aws, s3, docker, infrastructure]
category: devops
description: SSH, command execution, cloud storage, and n8n meta-operations
---

# DevOps & Infrastructure

## Overview
SSH, command execution, cloud storage, and n8n meta-operations.

## Nodes in This Category

---

### Ssh
**Type**: `n8n-nodes-base.ssh`  
**Description**: Executes commands on remote servers over SSH.  
**Auth Required**: `sshPassword`  
**Usage Count**: 3 templates

#### Usage Examples

##### Example 1: Start
**Source**: `examples/devops/docker-compose-controller.json`  
**Workflow**: Start/Stop a Docker service

**Credentials**: `{{CREDENTIAL_sshPassword}}`

**Configuration**:
```json
{
  "command": "=cd {{ $json.params.service }} && docker compose up -d",
  "cwd": "/home/ferristhiel"
}
```

##### Example 2: Stop
**Source**: `examples/devops/docker-compose-controller.json`  
**Workflow**: Start/Stop a Docker service

**Credentials**: `{{CREDENTIAL_sshPassword}}`

**Configuration**:
```json
{
  "command": "=cd {{ $json.params.service }} && docker compose down",
  "cwd": "/home/ferristhiel"
}
```

##### Example 3: Execute a command
**Source**: `examples/devops/linux-update-via-webhook.json`  
**Workflow**: Update Server

**Credentials**: `{{CREDENTIAL_sshPassword}}`

**Configuration**:
```json
{
  "command": "sudo apt update && sudo apt upgrade -y"
}
```


---

### ExecuteCommand
**Type**: `n8n-nodes-base.executeCommand`  
**Description**: Runs shell commands on the n8n host server.  
**Auth Required**: `none`  
**Usage Count**: 3 templates

#### Usage Examples

##### Example 1: Get Files and Folders
**Source**: `examples/OpenAI_and_LLMs/Organise Your Local File Directories With AI.json`  
**Workflow**: Organise Your Local File Directories With AI

**Configuration**:
```json
{
  "command": "=ls -p {{ $json.directory }} | grep -v / || true; \\\necho \"===\"; \\\nls -p {{ $json.directory }} | grep / || true;"
}
```

##### Example 2: Move Files into Folders
**Source**: `examples/OpenAI_and_LLMs/Organise Your Local File Directories With AI.json`  
**Workflow**: Organise Your Local File Directories With AI

**Configuration**:
```json
{
  "command": "=directory=\"{{ $('Set Variables').item.json.directory }}\"\nsubdirectory=\"$directory/{{ $json.folder }}\";\nfile_list=\"{{ $json.files.join(' ') }}\";\n\n# create subdirectory if not exists\nmkdir -p $subdirectory;\n\n# for each suggestion, move the file into the subdirectory.\n# If the file in the subdirectory exists, then we'll rename the current file by adding a small random string to the end of the filename.\nfor filename in $file_list; do\n if [ -e \"$subdirectory/$filename\" ]; then\n mv \"$directory/$filename-$RANDOM\" -t $subdirectory;\n else\n mv \"$directory/$filename\" -t $subdirectory;\n fi\ndone"
}
```

##### Example 3: mkdir
**Source**: `examples/OpenAI_and_LLMs/📚 Auto-generate documentation for n8n workflows with GPT and Docsify.json`  
**Workflow**: Docsify example

**Configuration**:
```json
{
  "command": "=mkdir -p {{$('CONFIG').first().json.project_path}}"
}
```


---

### N8n
**Type**: `n8n-nodes-base.n8n`  
**Description**: n8n node for n8n operations.  
**Auth Required**: `n8nApi`  
**Usage Count**: 4 templates

#### Common Operations/Modes
- `get`

#### Usage Examples

##### Example 1: n8n
**Source**: `examples/OpenAI_and_LLMs/Query n8n Credentials with AI SQL Agent.json`  
**Workflow**: Query n8n Credentials with AI SQL Agent

**Credentials**: `{{CREDENTIAL_n8nApi}}`

**Configuration**:
```json
{
  "filters": {},
  "requestOptions": {}
}
```

##### Example 2: Fetch Single Workflow1
**Source**: `examples/OpenAI_and_LLMs/📚 Auto-generate documentation for n8n workflows with GPT and Docsify.json`  
**Workflow**: Docsify example

**Credentials**: `{{CREDENTIAL_n8nApi}}`

**Configuration**:
```json
{
  "operation": "get",
  "workflowId": {
    "__rl": true,
    "mode": "id",
    "value": "={{ $('CONFIG').first().json.params.file.replaceAll('docs_','').split('.md')[0] }}"
  },
  "requestOptions": {}
}
```

##### Example 3: Get All Workflows
**Source**: `examples/OpenAI_and_LLMs/📚 Auto-generate documentation for n8n workflows with GPT and Docsify.json`  
**Workflow**: Docsify example

**Credentials**: `{{CREDENTIAL_n8nApi}}`

**Configuration**:
```json
{
  "filters": {
    "tags": "={{ decodeURIComponent(($json.params.file?.match(/^tag-(.+)\\.md$/))?.[1] || '') }}"
  },
  "requestOptions": {}
}
```

##### Example 4: Get Workflow tags
**Source**: `examples/OpenAI_and_LLMs/📚 Auto-generate documentation for n8n workflows with GPT and Docsify.json`  
**Workflow**: Docsify example

**Credentials**: `{{CREDENTIAL_n8nApi}}`

**Configuration**:
```json
{
  "filters": {},
  "requestOptions": {}
}
```


---

### ExecutionData
**Type**: `n8n-nodes-base.executionData`  
**Description**: n8n node for executionData operations.  
**Auth Required**: `none`  
**Usage Count**: 2 templates

#### Usage Examples

##### Example 1: Execution Data
**Source**: `examples/Forms_and_Surveys/Email Subscription Service with n8n Forms, Airtable and AI.json`  
**Workflow**: Email Subscription Service with n8n Forms, Airtable and AI

**Configuration**:
```json
{
  "dataToSave": {
    "values": [
      {
        "key": "email",
        "value": "={{ $json.email }}"
      }
    ]
  }
}
```

##### Example 2: Execution Data
**Source**: `examples/Other_Integrations_and_Use_Cases/API Schema Extractor.json`  
**Workflow**: API Schema Extractor

**Configuration**:
```json
{
  "dataToSave": {
    "values": [
      {
        "key": "eventType",
        "value": "={{ $json.eventType }}"
      },
      {
        "key": "executedById",
        "value": "={{ $json.executedById }}"
      },
      {
        "key": "service",
        "value": "={{ $json.data.service }}"
      }
    ]
  }
}
```


---

### S3
**Type**: `n8n-nodes-base.s3`  
**Description**: n8n node for s3 operations.  
**Auth Required**: `s3`  
**Usage Count**: 2 templates

#### Common Operations/Modes
- `upload`

#### Usage Examples

##### Example 1: Upload to Minio
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Hacker News to Video Content.json`  
**Workflow**: Hacker News to Video Template - AlexK1919

**Configuration**:
```json
{
  "operation": "upload",
  "bucketName": "=",
  "additionalFields": {
    "grantRead": true,
    "parentFolderKey": "="
  }
}
```

##### Example 2: Upload image to S3
**Source**: `examples/OpenAI_and_LLMs/Flux AI Image Generator.json`  
**Workflow**: Flux AI Image Generator

**Credentials**: `{{CREDENTIAL_s3}}`

**Configuration**:
```json
{
  "fileName": "=fg-{{ $execution.id }}.jpg",
  "operation": "upload",
  "bucketName": "flux-generator",
  "additionalFields": {}
}
```


---

### Dropbox
**Type**: `n8n-nodes-base.dropbox`  
**Description**: n8n node for dropbox operations.  
**Auth Required**: `dropboxOAuth2Api`  
**Usage Count**: 2 templates

#### Common Operations/Modes
- `download`

#### Usage Examples

##### Example 1: Dropbox
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Hacker News to Video Content.json`  
**Workflow**: Hacker News to Video Template - AlexK1919

##### Example 2: Load a test pdf file
**Source**: `examples/PDF_and_Document_Processing/Manipulate PDF with Adobe developer API.json`  
**Workflow**: Manipulate PDF with Adobe developer API

**Credentials**: `{{CREDENTIAL_dropboxOAuth2Api}}`

**Configuration**:
```json
{
  "path": "/valerian/w/prod/_freelance/ADEZIF/AI/Source data/Brochures pour GPT/Brochure 3M/3M_doc_emballage VERSION FINALE.pdf",
  "operation": "download",
  "authentication": "oAuth2"
}
```


---

### MicrosoftOneDrive
**Type**: `n8n-nodes-base.microsoftOneDrive`  
**Description**: n8n node for microsoftOneDrive operations.  
**Auth Required**: `none`  
**Usage Count**: 1 templates

#### Usage Examples

##### Example 1: Microsoft OneDrive
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Hacker News to Video Content.json`  
**Workflow**: Hacker News to Video Template - AlexK1919


---

### VenafiTlsProtectCloud
**Type**: `n8n-nodes-base.venafiTlsProtectCloud`  
**Description**: n8n node for venafiTlsProtectCloud operations.  
**Auth Required**: `venafiTlsProtectCloudApi`  
**Usage Count**: 2 templates

#### Usage Examples

##### Example 1: Venafi TLS Protect Cloud
**Source**: `examples/Slack/Venafi Cloud Slack Cert Bot.json`  
**Workflow**: Venafi Cloud Slack Cert Bot

**Credentials**: `{{CREDENTIAL_venafiTlsProtectCloudApi}}`

**Configuration**:
```json
{
  "options": {},
  "commonName": "={{ $('Parse Webhook').item.json.response.view.state.values.domain_name_block.domain_name_input.value.match(/^(\\*\\.)?([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}$/g).toString() }}",
  "generateCsr": true,
  "applicationId": "{{UUID}}",
  "additionalFields": {
    "organizationalUnits": [
      "={{ $json.name }}"
    ]
  },
  "certificateIssuingTemplateId": "{{UUID}}"
}
```

##### Example 2: Venafi TLS Protect Cloud1
**Source**: `examples/Slack/Venafi Cloud Slack Cert Bot.json`  
**Workflow**: Venafi Cloud Slack Cert Bot

**Credentials**: `{{CREDENTIAL_venafiTlsProtectCloudApi}}`

**Configuration**:
```json
{
  "options": {},
  "commonName": "={{ $json.response.message.blocks[2].text.text.match(/\\*Domain:\\*\\s*<http[^|]+\\|([^\\n]+)>/)[1] }}",
  "generateCsr": true,
  "applicationId": "{{UUID}}",
  "additionalFields": {
    "organizationalUnits": [
      "={{ $json.response.message.blocks[2].text.text.match(/\\*Team:\\*\\s*([^\\n]*)/)[1] }}"
    ]
  },
  "certificateIssuingTemplateId": "{{UUID}}"
}
```


---

### AwsComprehend
**Type**: `n8n-nodes-base.awsComprehend`  
**Description**: n8n node for awsComprehend operations.  
**Auth Required**: `aws`  
**Usage Count**: 1 templates

#### Common Operations/Modes
- `detectSentiment`

#### Usage Examples

##### Example 1: AWS Comprehend
**Source**: `examples/Other_Integrations_and_Use_Cases/Analyze feedback using AWS Comprehend and send it to a Mattermost channel.json`  
**Workflow**: Analyze feedback using AWS Comprehend and send it to a Mattermost channel

**Credentials**: `{{CREDENTIAL_aws}}`

**Configuration**:
```json
{
  "text": "={{$json[\"What did you think about the event?\"]}}",
  "operation": "detectSentiment"
}
```

