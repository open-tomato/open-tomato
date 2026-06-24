---
tags: [n8n, files, binary, pdf, images, csv, spreadsheet, compression]
category: file-operations
description: Read, write, convert and manipulate files and binary data
---

# File & Binary Operations

## Overview
Read, write, convert and manipulate files and binary data.

## Nodes in This Category

---

### ExtractFromFile
**Type**: `n8n-nodes-base.extractFromFile`  
**Description**: Extracts text from binary files: PDF, CSV, HTML, JSON, XML, DOCX, XLSX.  
**Auth Required**: `none`  
**Usage Count**: 36 templates

#### Common Operations/Modes
- `binaryToPropery`
- `fromJson`
- `ods`
- `pdf`
- `text`

#### Usage Examples

##### Example 1: Extract PDF Contents
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI.json`  
**Workflow**: Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI

**Configuration**:
```json
{
  "options": {},
  "operation": "pdf",
  "binaryPropertyName": "=file_{{ $itemIndex }}"
}
```

##### Example 2: Extract from File
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI.json`  
**Workflow**: Building RAG Chatbot for Movie Recommendations with Qdrant and Open AI

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 3: Extract data from file
**Source**: `examples/Database_and_Storage/Generate SQL queries from schema only - AI-powered.json`  
**Workflow**: Generate SQL queries from schema only - AI-powered

**Configuration**:
```json
{
  "options": {},
  "operation": "fromJson"
}
```

##### Example 4: Caption File Conversion
**Source**: `examples/Discord/Share YouTube Videos with AI Summaries on Discord.json`  
**Workflow**: YouTube Videos with AI Summaries on Discord

**Configuration**:
```json
{
  "options": {},
  "operation": "text",
  "destinationKey": "content"
}
```

##### Example 5: Extract from DOCX
**Source**: `examples/PDF_and_Document_Processing/Breakdown Documents into Study Notes using Templating MistralAI and Qdrant.json`  
**Workflow**: Breakdown Documents into Study Notes using Templating MistralAI and Qdrant

**Configuration**:
```json
{
  "options": {},
  "operation": "ods"
}
```


---

### ConvertToFile
**Type**: `n8n-nodes-base.convertToFile`  
**Description**: Converts item data to binary files: CSV, JSON, HTML, XLSX, PDF.  
**Auth Required**: `none`  
**Usage Count**: 15 templates

#### Common Operations/Modes
- `toBinary`
- `toJson`
- `toText`

#### Usage Examples

##### Example 1: Convert to File
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Ultimate Scraper Workflow for n8n.json`  
**Workflow**: Selenium Ultimate Scraper Workflow

**Configuration**:
```json
{
  "options": {},
  "operation": "toBinary",
  "sourceProperty": "value"
}
```

##### Example 2: Convert data to binary
**Source**: `examples/Database_and_Storage/Generate SQL queries from schema only - AI-powered.json`  
**Workflow**: Generate SQL queries from schema only - AI-powered

**Configuration**:
```json
{
  "options": {},
  "operation": "toJson"
}
```

##### Example 3: Convert Email Body to File
**Source**: `examples/Gmail_and_Email_Automation/Analyze & Sort Suspicious Email Contents with ChatGPT.json`  
**Workflow**: Analyze & Sort Suspicious Email Contents with ChatGPT

**Configuration**:
```json
{
  "options": {
    "fileName": "emailBody.txt"
  },
  "operation": "toText",
  "sourceProperty": "textBody"
}
```

##### Example 4: Convert to File
**Source**: `examples/LinkedIn/content_creator.json`  
**Workflow**: content_creator

**Configuration**:
```json
{
  "options": {},
  "operation": "toBinary",
  "sourceProperty": "data[0].b64_json",
  "binaryPropertyName": "=data"
}
```

##### Example 5: Convert to CSV
**Source**: `examples/PDF_and_Document_Processing/Extract text from PDF and image using Vertex AI (Gemini) into CSV.json`  
**Workflow**: Extract text from PDF and image using Vertex AI (Gemini) into CSV

**Configuration**:
```json
{
  "options": {}
}
```


---

### ReadWriteFile
**Type**: `n8n-nodes-base.readWriteFile`  
**Description**: Reads from or writes to the local filesystem.  
**Auth Required**: `none`  
**Usage Count**: 12 templates

#### Common Operations/Modes
- `write`

#### Usage Examples

##### Example 1: Read File
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Financial Documents Assistant using Qdrant and Mistral.ai.json`  
**Workflow**: Build a Financial Documents Assistant using Qdrant and Mistral.ai

**Configuration**:
```json
{
  "options": {},
  "fileSelector": "={{ $json.file_added }}"
}
```

##### Example 2: Save file locally
**Source**: `examples/Database_and_Storage/Generate SQL queries from schema only - AI-powered.json`  
**Workflow**: Generate SQL queries from schema only - AI-powered

**Configuration**:
```json
{
  "options": {},
  "fileName": "./chinook_mysql.json",
  "operation": "write"
}
```

##### Example 3: Save chinook.db locally
**Source**: `examples/Database_and_Storage/Talk to your SQLite database with a LangChain AI Agent.json`  
**Workflow**: SQL agent with memory

**Configuration**:
```json
{
  "options": {},
  "fileName": "./chinook.db",
  "operation": "write",
  "dataPropertyName": "file_0"
}
```

##### Example 4: Get Bank Statement File
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Reconcile Rent Payments with Local Excel Spreadsheet and OpenAI.json`  
**Workflow**: Reconcile Rent Payments with Local Excel Spreadsheet and OpenAI

**Configuration**:
```json
{
  "options": {},
  "fileSelector": "={{ $('Watch For Bank Statements').item.json.path }}"
}
```

##### Example 5: Load the schema from the local file
**Source**: `examples/Database_and_Storage/Generate SQL queries from schema only - AI-powered.json`  
**Workflow**: Generate SQL queries from schema only - AI-powered

**Configuration**:
```json
{
  "options": {},
  "fileSelector": "./chinook_mysql.json"
}
```


---

### EditImage
**Type**: `n8n-nodes-base.editImage`  
**Description**: Resizes, crops, composes, and annotates images.  
**Auth Required**: `none`  
**Usage Count**: 18 templates

#### Common Operations/Modes
- `crop`
- `information`
- `multiStep`
- `resize`

#### Usage Examples

##### Example 1: Crop Object From Image
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build Your Own Image Search Using AI Object Detection, CDN and ElasticSearchBuild Your Own Image Search Using AI Object Detection, CDN and ElasticSearch.json`  
**Workflow**: Build Your Own Image Search Using AI Object Detection, CDN and ElasticSearchBuild Your Own Image Search Using AI Object Detection, CDN and ElasticSearch

**Configuration**:
```json
{
  "width": "={{ $json.box.xmax - $json.box.xmin }}",
  "height": "={{ $json.box.ymax - $json.box.ymin }}",
  "options": {
    "format": "jpeg",
    "fileName": "={{ $binary.data.fileName.split('.')[0].urlEncode()+'-'+$json.label.urlEncode() + '-' + $itemIndex }}.jpg"
  },
  "operation": "crop",
  "positionX": "={{ $json.box.xmin }}",
  "positionY": "={{ $json.box.ymin }}"
}
```

##### Example 2: Resize Image
**Source**: `examples/Forms_and_Surveys/Email Subscription Service with n8n Forms, Airtable and AI.json`  
**Workflow**: Email Subscription Service with n8n Forms, Airtable and AI

**Configuration**:
```json
{
  "width": 480,
  "height": 360,
  "options": {},
  "operation": "resize"
}
```

##### Example 3: Get Image Size
**Source**: `examples/Google_Drive_and_Google_Sheets/Automatic Background Removal for Images in Google Drive.json`  
**Workflow**: Remove Advanced Background from Google Drive Images

**Configuration**:
```json
{
  "operation": "information"
}
```

##### Example 4: Resize
**Source**: `examples/Instagram_Twitter_Social_Media/Create dynamic Twitter profile banner.json`  
**Workflow**: Create dynamic Twitter profile banner

**Configuration**:
```json
{
  "width": 200,
  "height": 200,
  "options": {},
  "operation": "resize",
  "dataPropertyName": "avatar"
}
```

##### Example 5: Crop
**Source**: `examples/Instagram_Twitter_Social_Media/Create dynamic Twitter profile banner.json`  
**Workflow**: Create dynamic Twitter profile banner

**Configuration**:
```json
{
  "options": {
    "format": "png"
  },
  "operation": "multiStep",
  "operations": {
    "operations": [
      {
        "width": 200,
        "height": 200,
        "operation": "create",
        "backgroundColor": "#000000ff"
      },
      {
        "color": "#ffffff00",
        "operation": "draw",
        "primitive": "circle",
        "endPositionX": 25,
        "endPositionY": 50,
        "startPositionX": 100,
        "startPositionY": 100
      },
      {
        "operator": "In",
        "operation": "composite",
        "dataPropertyNameComposite": "avatar"
      }
    ]
  },
  "dataPropertyName": "avatar"
}
```


---

### ReadBinaryFile
**Type**: `n8n-nodes-base.readBinaryFile`  
**Description**: n8n node for readBinaryFile operations.  
**Auth Required**: `none`  
**Usage Count**: 2 templates

#### Usage Examples

##### Example 1: Read Video from Google Drive
**Source**: `examples/Google_Drive_and_Google_Sheets/Upload to Instagram and Tiktok from Google Drive.json`  
**Workflow**: template in store

**Configuration**:
```json
{
  "filePath": "={{ $('Read video from Google Drive').item.json.originalFilename.replaceAll(\" \", \"_\") }}",
  "dataPropertyName": "datavideo"
}
```

##### Example 2: Read Video from Google Drive2
**Source**: `examples/Google_Drive_and_Google_Sheets/Upload to Instagram and Tiktok from Google Drive.json`  
**Workflow**: template in store

**Configuration**:
```json
{
  "filePath": "={{ $('Read video from Google Drive').item.json.originalFilename.replaceAll(\" \", \"_\") }}",
  "dataPropertyName": "datavideo"
}
```


---

### ReadBinaryFiles
**Type**: `n8n-nodes-base.readBinaryFiles`  
**Description**: n8n node for readBinaryFiles operations.  
**Auth Required**: `none`  
**Usage Count**: 1 templates

#### Usage Examples

##### Example 1: LoadMP3
**Source**: `examples/OpenAI_and_LLMs/OpenAI examples_ ChatGPT, DALLE-2, Whisper-1 – 5-in-1.json`  
**Workflow**: OpenAI-model-examples

**Configuration**:
```json
{
  "fileSelector": "/home/node/.n8n/OpenAI-article/Using Science to Stop Your Mirror From Fogging Up.mp3"
}
```


---

### WriteBinaryFile
**Type**: `n8n-nodes-base.writeBinaryFile`  
**Description**: n8n node for writeBinaryFile operations.  
**Auth Required**: `none`  
**Usage Count**: 2 templates

#### Usage Examples

##### Example 1: Read video from Google Drive
**Source**: `examples/Google_Drive_and_Google_Sheets/Upload to Instagram and Tiktok from Google Drive.json`  
**Workflow**: template in store

**Configuration**:
```json
{
  "options": {},
  "fileName": "={{ $json.originalFilename.replaceAll(\" \", \"_\") }}"
}
```

##### Example 2: Save to Disk
**Source**: `examples/PDF_and_Document_Processing/Prepare CSV files with GPT-4Prepare CSV files with GPT-4.json`  
**Workflow**: Prepare CSV files with GPT-4

**Configuration**:
```json
{
  "options": {},
  "fileName": "=./.n8n/{{ $binary.data.fileName }}"
}
```


---

### ReadPDF
**Type**: `n8n-nodes-base.readPDF`  
**Description**: n8n node for readPDF operations.  
**Auth Required**: `none`  
**Usage Count**: 1 templates

#### Usage Examples

##### Example 1: Read PDF
**Source**: `examples/Gmail_and_Email_Automation/Send specific PDF attachments from Gmail to Google Drive using OpenAI.json`  
**Workflow**: Send specific PDF attachments from Gmail to Google Drive using OpenAI


---

### MoveBinaryData
**Type**: `n8n-nodes-base.moveBinaryData`  
**Description**: n8n node for moveBinaryData operations.  
**Auth Required**: `none`  
**Usage Count**: 2 templates

#### Common Operations/Modes
- `jsonToBinary`

#### Usage Examples

##### Example 1: Strip UTF BOM bytes
**Source**: `examples/PDF_and_Document_Processing/Prepare CSV files with GPT-4Prepare CSV files with GPT-4.json`  
**Workflow**: Prepare CSV files with GPT-4

**Configuration**:
```json
{
  "options": {
    "encoding": "utf8",
    "stripBOM": true,
    "jsonParse": false,
    "keepSource": false
  },
  "setAllData": false
}
```

##### Example 2: Create valid binary
**Source**: `examples/PDF_and_Document_Processing/Prepare CSV files with GPT-4Prepare CSV files with GPT-4.json`  
**Workflow**: Prepare CSV files with GPT-4

**Configuration**:
```json
{
  "mode": "jsonToBinary",
  "options": {
    "addBOM": false,
    "encoding": "utf8",
    "fileName": "=funny_names_{{ $('Split In Batches').item.json.index+1 }}.{{ $('Convert to CSV').first().binary.data.fileExtension }}",
    "mimeType": "text/csv",
    "keepSource": false,
    "useRawData": true
  },
  "convertAllData": false
}
```


---

### SpreadsheetFile
**Type**: `n8n-nodes-base.spreadsheetFile`  
**Description**: n8n node for spreadsheetFile operations.  
**Auth Required**: `none`  
**Usage Count**: 1 templates

#### Common Operations/Modes
- `toFile`

#### Usage Examples

##### Example 1: Convert to CSV
**Source**: `examples/PDF_and_Document_Processing/Prepare CSV files with GPT-4Prepare CSV files with GPT-4.json`  
**Workflow**: Prepare CSV files with GPT-4

**Configuration**:
```json
{
  "options": {
    "fileName": "=funny_names_{{ $('Split In Batches').item.json.index+1 }}.{{ $parameter[\"fileFormat\"] }}",
    "headerRow": true
  },
  "operation": "toFile",
  "fileFormat": "csv"
}
```


---

### Compression
**Type**: `n8n-nodes-base.compression`  
**Description**: n8n node for compression operations.  
**Auth Required**: `none`  
**Usage Count**: 3 templates

#### Usage Examples

##### Example 1: Extract Zip Files
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI.json`  
**Workflow**: Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI

##### Example 2: Extract zip file
**Source**: `examples/Database_and_Storage/Talk to your SQLite database with a LangChain AI Agent.json`  
**Workflow**: SQL agent with memory

##### Example 3: Extract Zip File
**Source**: `examples/PDF_and_Document_Processing/Transcribing Bank Statements To Markdown Using Gemini Vision AI.json`  
**Workflow**: Transcribing Bank Statements To Markdown Using Gemini Vision AI

