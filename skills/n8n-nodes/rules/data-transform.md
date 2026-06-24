---
tags: [n8n, data-transform, set, code, javascript, html, markdown, expressions]
category: data-transform
description: Nodes for transforming, setting, and computing data values
---

# Data Transformation

## Overview
Nodes for transforming, setting, and computing data values.

## Nodes in This Category

---

### Set
**Type**: `n8n-nodes-base.set`  
**Description**: Sets, renames, or removes fields on each item. The primary data transformation node.  
**Auth Required**: `none`  
**Usage Count**: 476 templates

#### Common Operations/Modes
- `raw`

#### Usage Examples

##### Example 1: Variables for medoids
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Automated Hugging Face Paper Summary Fetching & Categorization Workflow.json`  
**Workflow**: [3/3] Anomaly detection tool (crops dataset)

**Configuration**:
```json
{
  "options": {},
  "assignments": {
    "assignments": [
      {
        "name": "clusterCenterType",
        "type": "string",
        "value": "is_medoid"
      },
      {
        "name": "qdrantCloudURL",
        "type": "string",
        "value": "https://{{UUID}}.eu-central-1-0.aws.cloud.qdrant.io"
      },
      {
        "name": "collectionName",
        "type": "string",
        "value": "=agricultural-crops"
      },
      {
        "name": "clusterThresholdCenterType",
        "type": "string",
        "value": "is_medoid_cluster_threshold"
      }
    ]
  }
}
```

##### Example 2: Select company name and website
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Autonomous AI crawler.json`  
**Workflow**: Autonomous AI crawler

**Configuration**:
```json
{
  "include": "selected",
  "options": {},
  "assignments": {
    "assignments": []
  },
  "includeFields": "name,website",
  "includeOtherFields": true
}
```

##### Example 3: Prep Output For Export
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Customer Insights with Qdrant, Python and Information Extractor.json`  
**Workflow**: Customer Insights with Qdrant, Python and Information Extractor

**Configuration**:
```json
{
  "mode": "raw",
  "options": {},
  "jsonOutput": "={{ {\n ...$json.output,\n \"CompanyID\": $('Set Variables1').item.json.companyId,\n \"From\": $('Set Variables1').item.json.review_date_from,\n \"To\": $('Set Variables1').item.json.review_date_to,\n \"Number of Responses\": $('Get Payload of Points').item.json.result.length,\n \"Raw Responses\": $('Get Payload of Points').item.json.result.map(item =>\n [\n item.payload.metadata.review_date,\n item.payload.metadata.review_author,\n item.payload.metadata.review_rating,\n item.payload.content.replaceAll('\"', '\\\"').replaceAll('\\n', ' '),\n item.payload.metadata.review_url,\n ]\n ).join('\\n')\n} }}\n"
}
```

##### Example 4: Prompt Settings1
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Hacker News to Video Content.json`  
**Workflow**: Hacker News to Video Template - AlexK1919

**Configuration**:
```json
{
  "options": {},
  "assignments": {
    "assignments": [
      {
        "name": "model",
        "type": "string",
        "value": "{{UUID}}"
      }
    ]
  },
  "includeOtherFields": true
}
```

##### Example 5: Rename keywords
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Scrape and summarize posts of a news site without RSS feed using AI and save them to a NocoDB.json`  
**Workflow**: News Extraction

**Configuration**:
```json
{
  "fields": {
    "values": [
      {
        "name": "keywords",
        "stringValue": "={{ $json[\"message\"][\"content\"] }}"
      }
    ]
  },
  "include": "none",
  "options": {}
}
```


---

### Code
**Type**: `n8n-nodes-base.code`  
**Description**: Executes custom JavaScript or Python code. Access input items via `$input.all()` or `$input.first()`.  
**Auth Required**: `none`  
**Usage Count**: 164 templates

#### Common Operations/Modes
- `runOnceForEachItem`

#### Usage Examples

##### Example 1: Compare scores
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Automated Hugging Face Paper Summary Fetching & Categorization Workflow.json`  
**Workflow**: [3/3] Anomaly detection tool (crops dataset)

**Configuration**:
```json
{
  "language": "python",
  "pythonCode": "points = _input.first()['json']['result']['points']\nthreshold_type = _('Variables for medoids').first()['json']['clusterThresholdCenterType']\n\nmax_score = -1\ncrop_with_max_score = None\nundefined = True\n\nfor center in points:\n if center['score'] >= center['payload'][threshold_type]:\n undefined = False\n if center['score'] > max_score:\n max_score = center['score']\n crop_with_max_score = center['payload']['crop_name']\n\nif undefined:\n result_message = \"ALERT, we might have a new undefined crop!\"\nelse:\n result_message = f\"Looks similar to {crop_with_max_score}\"\n\nreturn [{\n \"json\": {\n \"result\": result_message\n }\n}]\n"
}
```

**Code**:
```python
points = _input.first()['json']['result']['points']
threshold_type = _('Variables for medoids').first()['json']['clusterThresholdCenterType']

max_score = -1
crop_with_max_score = None
undefined = True

for center in points:
 if center['score'] >= center['payload'][threshold_type]:
 undefined = False
 if center['score'] > max_score:
 max_score = center['score']
 crop_with_max_score = center['payload']['crop_name']

if undefined:
 result_message = "ALERT, we might have a new undefined crop!"
else:
 result_message = f"Looks similar to {crop_with_max_score}"

return [{
 "json": {
 "result": result_message
 }
}]

```

##### Example 2: Calculation same period previous year
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Create a Google Analytics Data Report with AI and sent it to E-Mail and Telegram.json`  
**Workflow**: Google Analytics: Weekly Report

**Configuration**:
```json
{
  "jsCode": "return {\n // Berechnung des Startdatums: Vorjahr, gleiche Woche, 7 Tage zurück\n startDate: (() => {\n const date = new Date();\n date.setFullYear(date.getFullYear() - 1); // Zurück ins Vorjahr\n date.set..."
}
```

**Code**:
```python
return {
 // Berechnung des Startdatums: Vorjahr, gleiche Woche, 7 Tage zurück
 startDate: (() => {
 const date = new Date();
 date.setFullYear(date.getFullYear() - 1); // Zurück ins Vorjahr
 date.setDate(date.getDate() - 7); // 7 Tage zurück
 return date.toISOString().split('T')[0];
 })(),
 
 // Berechnung des Enddatums: Vorjahr, heutiges Datum
 endDate: (() => {
 const date = new Date();
 date.setFullYear(date.getFullYear() - 1); // Zurück ins Vorjahr
 return date.toISOString().split('T')[0];
 })(),
};

```

##### Example 3: Finnaly format the output
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Make OpenAI Citation for File Retrieval RAG.json`  
**Workflow**: Make OpenAI Citation for File Retrieval RAG

**Configuration**:
```json
{
  "mode": "runOnceForEachItem",
  "jsCode": "let saida = $('OpenAI Assistant with Vector Store').item.json.output;\n\nfor (let i of $input.item.json.data) {\n saida = saida.replaceAll(i.text, \" _(\"+ i.filename+\")_ \");\n}\n\n$input.item.json.output = s..."
}
```

**Code**:
```python
let saida = $('OpenAI Assistant with Vector Store').item.json.output;

for (let i of $input.item.json.data) {
 saida = saida.replaceAll(i.text, " _("+ i.filename+")_ ");
}

$input.item.json.output = saida;
return $input.item;
```

##### Example 4: Scipy Sparse Matrix
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Vector Database as a Big Data Analysis Tool for AI Agents [2_3 - anomaly].json`  
**Workflow**: [2/3] Set up medoids (2 types) for anomaly detection (crops dataset)

**Configuration**:
```json
{
  "mode": "runOnceForEachItem",
  "language": "python",
  "pythonCode": "from scipy.sparse import coo_array\n\ncluster = _input.item.json['result']\n\nscores = list(cluster['scores'])\noffsets_row = list(cluster['offsets_row'])\noffsets_col = list(cluster['offsets_col'])\n\ncluster_matrix = coo_array((scores, (offsets_row, offsets_col)))\nthe_most_similar_to_others = cluster_matrix.sum(axis=1).argmax()\n\nreturn {\n \"json\": {\n \"medoid_id\": cluster[\"ids\"][the_most_similar_to_others]\n }\n}\n"
}
```

**Code**:
```python
from scipy.sparse import coo_array

cluster = _input.item.json['result']

scores = list(cluster['scores'])
offsets_row = list(cluster['offsets_row'])
offsets_col = list(cluster['offsets_col'])

cluster_matrix = coo_array((scores, (offsets_row, offsets_col)))
the_most_similar_to_others = cluster_matrix.sum(axis=1).argmax()

return {
 "json": {
 "medoid_id": cluster["ids"][the_most_similar_to_others]
 }
}

```

##### Example 5: Apply K-means Clustering Algorithm
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Customer Insights with Qdrant, Python and Information Extractor.json`  
**Workflow**: Customer Insights with Qdrant, Python and Information Extractor

**Configuration**:
```json
{
  "language": "python",
  "pythonCode": "import numpy as np\nfrom sklearn.cluster import KMeans\n\n# get vectors for all answers\npoint_ids = [item.id for item in _input.first().json.result.points]\nvectors = [item.vector.to_py() for item in _input.first().json.result.points]\nvectors_array = np.array(vectors)\n\n# apply k-means clustering where n_clusters = 5\n# this is a max and we'll discard some of these clusters later\nkmeans = KMeans(n_clusters=min(len(vectors), 5), random_state=42).fit(vectors_array)\nlabels = kmeans.labels_\nunique_labels = set(labels)\n\n# Extract and print points in each cluster\nclusters = {}\nfor label in set(labels):\n clusters[label] = vectors_array[labels == label]\n\n# return Qdrant point ids for each cluster\n# we'll use these ids to fetch the payloads from the vector store.\noutput = []\nfor cluster_id, cluster_points in clusters.items():\n points = [point_ids[i] for i in range(len(labels)) if labels[i] == cluster_id]\n output.append({\n \"id\": f\"Cluster {cluster_id}\",\n \"total\": len(cluster_points),\n \"points\": points\n })\n\nreturn {\"json\": {\"output\": output } }"
}
```

**Code**:
```python
import numpy as np
from sklearn.cluster import KMeans

# get vectors for all answers
point_ids = [item.id for item in _input.first().json.result.points]
vectors = [item.vector.to_py() for item in _input.first().json.result.points]
vectors_array = np.array(vectors)

# apply k-means clustering where n_clusters = 5
# this is a max and we'll discard some of these clusters later
kmeans = KMeans(n_clusters=min(len(vectors), 5), random_state=42).fit(vectors_array)
labels = kmeans.labels_
unique_labels = set(labels)

# Extract and print points in each cluster
clusters = {}
for label in set(labels):
 clusters[label] = vectors_array[labels == label]

# return Qdrant point ids for each cluster
# we'll use these ids to fetch the payloads from the vector store.
output = []
for cluster_id, cluster_points in clusters.items():
 points = [point_ids[i] for i in range(len(labels)) if labels[i] == cluster_id]
 output.append({
 "id": f"Cluster {cluster_id}",
 "total": len(cluster_points),
 "points": points
 })

return {"json": {"output": output } }
```


---

### Function
**Type**: `n8n-nodes-base.function`  
**Description**: Legacy JavaScript function node (v1). Prefer Code node for new workflows.  
**Auth Required**: `none`  
**Usage Count**: 10 templates

#### Usage Examples

##### Example 1: Function
**Source**: `examples/Instagram_Twitter_Social_Media/Create dynamic Twitter profile banner.json`  
**Workflow**: Create dynamic Twitter profile banner

**Configuration**:
```json
{
  "functionCode": "const binary = {};\nfor (let i=0; i < items.length; i++) {\n binary[`data${i}`] = items[i].binary.avatar;\n}\n\nreturn [\n {\n json: {\n numIcons: items.length,\n },\n binary,\n }\n];\n"
}
```

**Code**:
```python
const binary = {};
for (let i=0; i < items.length; i++) {
 binary[`data${i}`] = items[i].binary.avatar;
}

return [
 {
 json: {
 numIcons: items.length,
 },
 binary,
 }
];

```

##### Example 2: 🗺️ Map Freshdesk Fields to Linear
**Source**: `examples/Linear/Bidirectional ticket sync between Freshdesk and Linear with error logging.json`  
**Workflow**: Freshdesk-YOUR_OPENAI_KEY_HERE Bridge

**Configuration**:
```json
{
  "functionCode": "// Map Freshdesk priority to Linear priority\nconst freshdeskPriority = items[0].json.priority;\nlet linearPriority = 0;\n\nswitch(freshdeskPriority) {\n  case 1: // Low\n    linearPriority = 4;\n    break;\n..."
}
```

**Code**:
```python
// Map Freshdesk priority to Linear priority
const freshdeskPriority = items[0].json.priority;
let linearPriority = 0;

switch(freshdeskPriority) {
  case 1: // Low
    linearPriority = 4;
    break;
  case 2: // Medium
    linearPriority = 3;
    break;
  case 3: // High
    linearPriority = 2;
    break;
  case 4: // Urgent
    linearPriority = 1;
    break;
  default:
    linearPriority = 3;
}

// Map Freshdesk status to Linear state
const freshdeskStatus = items[0].json.status;
let linearStateId = 'todo'; // Default to todo state

switch(freshdeskStatus) {
  case 2: // Open
    linearStateId = 'todo';
    break;
  case 3: // Pending
    linearStateId = 'in_progress';
    break;
  case 4: // Resolved
    linearStateId = 'done';
    break;
  case 5: // Closed
    linearStateId = 'canceled';
    break;
}

return [{
  json: {
    ...items[0].json,
    linearPriority: linearPriority,
    linearStateId: linearStateId,
    linearTitle: items[0].json.subject || 'Freshdesk Ticket #' + items[0].json.id,
    linearDescription: items[0].json.description_text || items[0].json.description || 'No description provided'
  }
}];
```

##### Example 3: ❌ Log Linear Creation Error
**Source**: `examples/Linear/Bidirectional ticket sync between Freshdesk and Linear with error logging.json`  
**Workflow**: Freshdesk-YOUR_OPENAI_KEY_HERE Bridge

**Configuration**:
```json
{
  "functionCode": "// Log error details\nconst errorData = {\n  timestamp: new Date().toISOString(),\n  workflow: 'Sync Freshdesk and Linear tickets',\n  error: 'Failed to create Linear issue',\n  freshdeskTicketId: items[0]..."
}
```

**Code**:
```python
// Log error details
const errorData = {
  timestamp: new Date().toISOString(),
  workflow: 'Sync Freshdesk and Linear tickets',
  error: 'Failed to create Linear issue',
  freshdeskTicketId: items[0].json.id,
  freshdeskTicketSubject: items[0].json.subject,
  linearResponse: items[0].json
};

console.error('Linear Issue Creation Failed:', JSON.stringify(errorData, null, 2));

return [{
  json: {
    error: true,
    message: 'Failed to create Linear issue',
    details: errorData
  }
}];
```

##### Example 4: 🎉 Log Linear Creation Success
**Source**: `examples/Linear/Bidirectional ticket sync between Freshdesk and Linear with error logging.json`  
**Workflow**: Freshdesk-YOUR_OPENAI_KEY_HERE Bridge

**Configuration**:
```json
{
  "functionCode": "// Log successful creation\nconst successData = {\n  timestamp: new Date().toISOString(),\n  workflow: 'Sync Freshdesk and Linear tickets',\n  message: 'Successfully created Linear issue and linked to Fre..."
}
```

**Code**:
```python
// Log successful creation
const successData = {
  timestamp: new Date().toISOString(),
  workflow: 'Sync Freshdesk and Linear tickets',
  message: 'Successfully created Linear issue and linked to Freshdesk ticket',
  freshdeskTicketId: items[0].json.id,
  linearIssueId: items[0].json.data?.issueCreate?.issue?.id,
  linearIssueKey: items[0].json.data?.issueCreate?.issue?.identifier,
  action: 'create_linear_from_freshdesk'
};

console.log('Creation Success:', JSON.stringify(successData, null, 2));

return [{
  json: {
    success: true,
    message: 'Successfully created Linear issue from Freshdesk ticket',
    details: successData
  }
}];
```

##### Example 5: 📄 Map Linear to Freshdesk Fields
**Source**: `examples/Linear/Bidirectional ticket sync between Freshdesk and Linear with error logging.json`  
**Workflow**: Freshdesk-YOUR_OPENAI_KEY_HERE Bridge

**Configuration**:
```json
{
  "functionCode": "// Map Linear state to Freshdesk status\nconst linearState = items[0].json.data.state.name.toLowerCase();\nlet freshdeskStatus = 2; // Default to Open\n\nswitch(linearState) {\n  case 'todo':\n  case 'backl..."
}
```

**Code**:
```python
// Map Linear state to Freshdesk status
const linearState = items[0].json.data.state.name.toLowerCase();
let freshdeskStatus = 2; // Default to Open

switch(linearState) {
  case 'todo':
  case 'backlog':
    freshdeskStatus = 2; // Open
    break;
  case 'in progress':
  case 'in_progress':
    freshdeskStatus = 3; // Pending
    break;
  case 'done':
  case 'completed':
    freshdeskStatus = 4; // Resolved
    break;
  case 'canceled':
  case 'cancelled':
    freshdeskStatus = 5; // Closed
    break;
}

// Map Linear priority to Freshdesk priority
const linearPriority = items[0].json.data.priority || 3;
let freshdeskPriority = 2; // Default to Medium

switch(linearPriority) {
  case 1: // Urgent
    freshdeskPriority = 4;
    break;
  case 2: // High
    freshdeskPriority = 3;
    break;
  case 3: // Medium
    freshdeskPriority = 2;
    break;
  case 4: // Low
    freshdeskPriority = 1;
    break;
}

// Extract Freshdesk ticket ID from Linear issue description
const description = items[0].json.data.description || '';
const ticketIdMatch = description.match(/Freshdesk Ticket ID: (\d+)/);
const freshdeskTicketId = ticketIdMatch ? ticketIdMatch[1] : null;

return [{
  json: {
    ...items[0].json,
    freshdeskStatus: freshdeskStatus,
    freshdeskPriority: freshdeskPriority,
    freshdeskTicketId: freshdeskTicketId,
    linearTitle: items[0].json.data.title,
    linearDescription: items[0].json.data.description
  }
}];
```


---

### FunctionItem
**Type**: `n8n-nodes-base.functionItem`  
**Description**: n8n node for functionItem operations.  
**Auth Required**: `none`  
**Usage Count**: 1 templates

#### Usage Examples

##### Example 1: FunctionItem
**Source**: `examples/Instagram_Twitter_Social_Media/OpenAI-powered tweet generator.json`  
**Workflow**: OpenAI-powered tweet generator

**Configuration**:
```json
{
  "functionCode": "// hashtag list\nconst Hashtags = [\n \"#techtwitter\",\n \"#n8n\"\n];\n\n// random output function\nconst randomHashtag = Hashtags[Math.floor(Math.random() * Hashtags.length)];\nitem.hashtag = randomHashtag;\nret..."
}
```

**Code**:
```python
// hashtag list
const Hashtags = [
 "#techtwitter",
 "#n8n"
];

// random output function
const randomHashtag = Hashtags[Math.floor(Math.random() * Hashtags.length)];
item.hashtag = randomHashtag;
return item;
```


---

### Html
**Type**: `n8n-nodes-base.html`  
**Description**: Generates HTML from a template string with item data interpolation.  
**Auth Required**: `none`  
**Usage Count**: 42 templates

#### Common Operations/Modes
- `extractHtmlContent`

#### Usage Examples

##### Example 1: Retrieve URLs
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Autonomous AI crawler.json`  
**Workflow**: Autonomous AI crawler

**Configuration**:
```json
{
  "options": {},
  "operation": "extractHtmlContent",
  "extractionValues": {
    "values": [
      {
        "key": "output",
        "cssSelector": "a",
        "returnArray": true,
        "returnValue": "attribute"
      }
    ]
  }
}
```

##### Example 2: Generate Email
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Deduplicate Scraping AI Grants for Eligibility using AI.json`  
**Workflow**: Deduplicate Scraping AI Grants for Eligibility using AI

**Configuration**:
```json
{
  "html": "<!DOCTYPE HTML PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional //EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">\n<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\">\n<head>\n<!--[if gte mso 9]>\n<xml>\n <o:OfficeDocumentSettings>\n <o:AllowPNG/>\n <o:PixelsPerInch>96</o:PixelsPerInch>\n </o:OfficeDocumentSettings>\n</xml>\n<![endif]-->\n <meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\">\n <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n <meta name=\"x-apple-disable-message-reformatting\">\n <!--[if !mso]><!--><meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\"><!--<![endif]-->\n <title></title>\n \n <style type=\"text/css\">\n @media only screen and (min-width: 520px) {\n .u-row {\n width: 500px !important;\n }\n .u-row .u-col {\n vertical-align: top;\n }\n\n .u-row .u-col-100 {\n width: 500px !important;\n }\n\n}\n\n@media (max-width: 520px) {\n .u-row-container {\n max-width: 100% !important;\n padding-left: 0px !important;\n padding-right: 0px !important;\n }\n .u-row .u-col {\n min-width: 320px !important;\n max-width: 100% !important;\n display: block !important;\n }\n .u-row {\n width: 100% !important;\n }\n .u-col {\n width: 100% !important;\n }\n .u-col > div {\n margin: 0 auto;\n }\n}\nbody {\n margin: 0;\n padding: 0;\n}\n\ntable,\ntr,\ntd {\n vertical-align: top;\n border-collapse: collapse;\n}\n\np {\n margin: 0;\n}\n\n.ie-container table,\n.mso-container table {\n table-layout: fixed;\n}\n\n* {\n line-height: inherit;\n}\n\na[x-apple-data-detectors='true'] {\n color: inherit !important;\n text-decoration: none !important;\n}\n\ntable, td { color: #000000; } </style>\n \n \n\n</head>\n\n<body class=\"clean-body u_body\" style=\"margin: 0;padding: 0;-webkit-text-size-adjust: 100%;background-color: #F7F8F9;color: #000000\">\n <!--[if IE]><div class=\"ie-container\"><![endif]-->\n <!--[if 
```

##### Example 3: Extract essay names
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Scrape and summarize webpages with AI.json`  
**Workflow**: Scrape and summarize webpages with AI

**Configuration**:
```json
{
  "options": {},
  "operation": "extractHtmlContent",
  "dataPropertyName": "=data",
  "extractionValues": {
    "values": [
      {
        "key": "essay",
        "attribute": "href",
        "cssSelector": "table table a",
        "returnArray": true,
        "returnValue": "attribute"
      }
    ]
  }
}
```

##### Example 4: Extract Reviews
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Customer Insights with Qdrant, Python and Information Extractor.json`  
**Workflow**: Customer Insights with Qdrant, Python and Information Extractor

**Configuration**:
```json
{
  "options": {
    "trimValues": true
  },
  "operation": "extractHtmlContent",
  "extractionValues": {
    "values": [
      {
        "key": "review_author",
        "cssSelector": "[data-service-review-card-paper] [data-consumer-name-typography]",
        "returnArray": true
      },
      {
        "key": "review_rating",
        "attribute": "data-service-review-rating",
        "cssSelector": "[data-service-review-rating]",
        "returnArray": true,
        "returnValue": "attribute"
      },
      {
        "key": "review_title",
        "cssSelector": "[data-service-review-title-typography]",
        "returnArray": true
      },
      {
        "key": "review_text",
        "cssSelector": "[data-service-review-text-typography]",
        "returnArray": true
      },
      {
        "key": "review_date_of_experience",
        "cssSelector": "[data-service-review-date-of-experience-typography]",
        "returnArray": true
      },
      {
        "key": "review_date",
        "attribute": "datetime",
        "cssSelector": "[data-service-review-date-time-ago]",
        "returnArray": true,
        "returnValue": "attribute"
      },
      {
        "key": "review_country",
        "cssSelector": "[data-consumer-country-typography]",
        "returnArray": true
      },
      {
        "key": "review_author_reviews_count",
        "cssSelector": "[data-consumer-reviews-count-typography]",
        "returnArray": true
      },
      {
        "key": "review_url",
        "attribute": "href",
        "cssSelector": "a[data-review-title-typography]",
        "returnArray": true,
        "returnValue": "attribute"
      }
    ]
  }
}
```

##### Example 5: Extract
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Scrape Trustpilot Reviews with DeepSeek, Analyze Sentiment with OpenAI.json`  
**Workflow**: Scrape Trustpilot Reviews with DeepSeek, Analyze Sentiment with OpenAI

**Configuration**:
```json
{
  "options": {},
  "operation": "extractHtmlContent",
  "extractionValues": {
    "values": [
      {
        "key": "recensioni",
        "attribute": "href",
        "cssSelector": "article section a",
        "returnArray": true,
        "returnValue": "attribute"
      }
    ]
  }
}
```


---

### Markdown
**Type**: `n8n-nodes-base.markdown`  
**Description**: Converts HTML to Markdown or renders Markdown to HTML.  
**Auth Required**: `none`  
**Usage Count**: 23 templates

#### Common Operations/Modes
- `markdownToHtml`

#### Usage Examples

##### Example 1: Convert HTML to Markdown
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Autonomous AI crawler.json`  
**Workflow**: Autonomous AI crawler

**Configuration**:
```json
{
  "html": "={{ $json.data }}",
  "options": {
    "ignore": "a,img"
  }
}
```

##### Example 2: Convert2HTML
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Learn Anything from HN - Get Top Resource Recommendations from Hacker News.json`  
**Workflow**: Learn Anything from HN - Get Top Resource Recommendations from Hacker News

**Configuration**:
```json
{
  "mode": "markdownToHtml",
  "options": {},
  "markdown": "={{ $json.text }}"
}
```

##### Example 3: Optional Markdown to HTML
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Make OpenAI Citation for File Retrieval RAG.json`  
**Workflow**: Make OpenAI Citation for File Retrieval RAG

**Configuration**:
```json
{
  "html": "={{ $json.output }}",
  "options": {},
  "destinationKey": "output"
}
```

##### Example 4: Convert response to HTML
**Source**: `examples/Gmail_and_Email_Automation/Compose reply draft in Gmail with OpenAI Assistant.json`  
**Workflow**: Compose reply draft in Gmail with OpenAI Assistant

**Configuration**:
```json
{
  "mode": "markdownToHtml",
  "options": {
    "simpleLineBreaks": false
  },
  "markdown": "={{ $json.response }}",
  "destinationKey": "response"
}
```

##### Example 5: Markdown
**Source**: `examples/Gmail_and_Email_Automation/A Very Simple _Human in the Loop_ Email Response System Using AI and IMAP.json`  
**Workflow**: Very simple Human in the loop system email with AI e IMAP

**Configuration**:
```json
{
  "html": "={{ $json.textHtml }}",
  "options": {}
}
```


---

### DateTime
**Type**: `n8n-nodes-base.dateTime`  
**Description**: Formats, parses, and manipulates date/time values.  
**Auth Required**: `none`  
**Usage Count**: 5 templates

#### Common Operations/Modes
- `getTimeBetweenDates`
- `subtractFromDate`

#### Usage Examples

##### Example 1: Date & Time
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Intelligent Web Query and Semantic Re-Ranking Flow using Brave and Google Gemini.json`  
**Workflow**: Intelligent Web Query and Semantic Re-Ranking Flow

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 2: Date & Time - Substract
**Source**: `examples/OpenAI_and_LLMs/AI-Generated Summary Block for WordPress Posts.json`  
**Workflow**: AI-Generated Summary Block for WordPress Posts - with OpenAI, WordPress, Google Sheets & Slack

**Configuration**:
```json
{
  "options": {},
  "duration": 30,
  "timeUnit": "seconds",
  "magnitude": "={{ $json.timestamp }}",
  "operation": "subtractFromDate",
  "outputFieldName": "last_execution_date"
}
```

##### Example 3: Get timeDifference
**Source**: `examples/OpenAI_and_LLMs/🚀 Local Multi-LLM Testing & Performance Tracker.json`  
**Workflow**: Testing Mulitple Local LLM with LM Studio

**Configuration**:
```json
{
  "endDate": "={{ $json.endDateTime }}",
  "options": {},
  "operation": "getTimeBetweenDates",
  "startDate": "={{ $('Capture Start Time').item.json.startDateTime }}"
}
```

##### Example 4: Capture End Time
**Source**: `examples/OpenAI_and_LLMs/🚀 Local Multi-LLM Testing & Performance Tracker.json`  
**Workflow**: Testing Mulitple Local LLM with LM Studio

**Configuration**:
```json
{
  "options": {},
  "outputFieldName": "endDateTime"
}
```

##### Example 5: Capture Start Time
**Source**: `examples/OpenAI_and_LLMs/🚀 Local Multi-LLM Testing & Performance Tracker.json`  
**Workflow**: Testing Mulitple Local LLM with LM Studio

**Configuration**:
```json
{
  "options": {},
  "outputFieldName": "startDateTime"
}
```


---

### Crypto
**Type**: `n8n-nodes-base.crypto`  
**Description**: Hashes or encrypts data using MD5, SHA256, AES and other algorithms.  
**Auth Required**: `none`  
**Usage Count**: 4 templates

#### Usage Examples

##### Example 1: UUID
**Source**: `examples/Forms_and_Surveys/Conversational Interviews with AI Agents and n8n Forms.json`  
**Workflow**: Conversational Interviews with AI Agents and n8n Forms

**Configuration**:
```json
{
  "action": "generate"
}
```

##### Example 2: Generate UUID
**Source**: `examples/Gmail_and_Email_Automation/Send a ChatGPT email reply and save responses to Google Sheets.json`  
**Workflow**: Send a ChatGPT email reply and save responses to Google Sheets

**Configuration**:
```json
{
  "action": "generate",
  "dataPropertyName": "uuid"
}
```

##### Example 3: Generate Unique Hash for Name
**Source**: `examples/Google_Drive_and_Google_Sheets/Extract Information from a Logo Sheet using forms, AI, Google Sheet and Airtable.json`  
**Workflow**: AI Logo Sheet Extractor to Airtable

**Configuration**:
```json
{
  "value": "={{ $json.name.toLowerCase().trim() }}",
  "dataPropertyName": "hash"
}
```

##### Example 4: Generate Unique Hash for Similar
**Source**: `examples/Google_Drive_and_Google_Sheets/Extract Information from a Logo Sheet using forms, AI, Google Sheet and Airtable.json`  
**Workflow**: AI Logo Sheet Extractor to Airtable

**Configuration**:
```json
{
  "value": "={{ $json.similar.toLowerCase().trim() }}",
  "dataPropertyName": "hash"
}
```

