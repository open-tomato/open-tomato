---
tags: [n8n, langchain, ai, agents, chains, llm, openai]
category: langchain-agents
description: AI agent orchestration, LLM chains, output parsers, sentiment and text classification nodes
---

# LangChain Agents & Chains

## Overview
AI agent orchestration, LLM chains, output parsers, sentiment and text classification nodes.

## Nodes in This Category

---

### Agent
**Type**: `@n8n/n8n-nodes-langchain.agent`  
**Description**: Runs an autonomous AI agent that can use tools to complete tasks. Supports conversationalAgent, openAiFunctionsAgent, reActAgent, sqlAgent, and toolsAgent types.  
**Auth Required**: `postgres`  
**Usage Count**: 121 templates

#### Common Operations/Modes
- `conversationalAgent`
- `openAiFunctionsAgent`
- `reActAgent`
- `sqlAgent`

#### Sub-Node Connection Patterns

The AI Agent node uses special connection types for its sub-nodes. These are **not** regular `main` data connections — they use dedicated connection types that appear as sub-node slots in the n8n editor.

**LLM Model** (required): Connect a language model node to the agent via `ai_languageModel`:
```json
"Anthropic Chat Model": {
  "ai_languageModel": [
    [
      {
        "node": "AI Agent",
        "type": "ai_languageModel",
        "index": 0
      }
    ]
  ]
}
```

**Memory** (optional): Connect a memory node via `ai_memory`:
```json
"Simple Memory": {
  "ai_memory": [
    [
      {
        "node": "AI Agent",
        "type": "ai_memory",
        "index": 0
      }
    ]
  ]
}
```

**Tools** (optional): Connect tool nodes via `ai_tool`:
```json
"HTTP Request Tool": {
  "ai_tool": [
    [
      {
        "node": "AI Agent",
        "type": "ai_tool",
        "index": 0
      }
    ]
  ]
}
```

**Output Parser** (optional): Connect a parser via `ai_outputParser`:
```json
"Structured Output Parser": {
  "ai_outputParser": [
    [
      {
        "node": "AI Agent",
        "type": "ai_outputParser",
        "index": 0
      }
    ]
  ]
}
```

> **Key rule**: The connection flows **from** the sub-node **to** the agent. The sub-node's name is the key, and the agent node name appears in the target object. Multiple tools can connect to the same agent — each gets its own entry with the same `ai_tool` connection type.

#### Usage Examples

##### Example 1: Crawl website
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Autonomous AI crawler.json`  
**Workflow**: Autonomous AI crawler

**Configuration**:
```json
{
  "text": "=Retrieve social media profile URLs from this website: {{ $json.website }}",
  "options": {
    "systemMessage": "You are an automated web crawler tasked with extracting social media URLs from a webpage provided by the user. You have access to a text retrieval tool to gather all text content from the page and a URL retrieval tool to identify and navigate through links on the page. Utilize the URLs retrieved to crawl additional pages. Your objective is to provide a unified JSON output containing the extracted data (links to all possible social media profiles from the website)."
  },
  "promptType": "define",
  "hasOutputParser": true
}
```

**Prompt/System Message**:
```
You are an automated web crawler tasked with extracting social media URLs from a webpage provided by the user. You have access to a text retrieval tool to gather all text content from the page and a URL retrieval tool to identify and navigate through links on the page. Utilize the URLs retrieved to crawl additional pages. Your objective is to provide a unified JSON output containing the extracted data (links to all possible social media profiles from the website).
```

##### Example 2: AI Agent
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI.json`  
**Workflow**: Build a Tax Code Assistant with Qdrant, Mistral.ai and OpenAI

**Configuration**:
```json
{
  "options": {
    "systemMessage": "You are a helpful assistant answering user questions on the tax code legistration for the state of Texas, united states of america.\n\nAlong with your response also note in which chapter and section number the information was found. "
  }
}
```

**Prompt/System Message**:
```
You are a helpful assistant answering user questions on the tax code legistration for the state of Texas, united states of america.

Along with your response also note in which chapter and section number the information was found. 
```

**Prompt/System Message**:
```
You are a helpful assistant answering user questions on the tax code legistration for the state of Texas, united states of america.

Along with your response also note in which chapter and section number the information was found. 
```

##### Example 3: Object Identifier Agent
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Enrich Property Inventory Survey with Image Recognition and AI Agent.json`  
**Workflow**: Enrich Property Inventory Survey with Image Recognition and AI Agent

**Configuration**:
```json
{
  "text": "=system: Your role is to help an building surveyor perform a object classification and data collection task whereby the surveyor will take photos of various objects and your job is to try and identify accurately certain product attributes of the objects as detailed below.\n\nThe surveyor has given you the following:\n1) photo url ```{{ $('Get Applicable Rows').item.json.Image[0].thumbnails.large.url }}```.\n2) photo description ```{{ $json.content }}```.\n\nFor each product attribute the surveyor is unable to determine, you may:\n1) use the reverse image search tool to search the product on the internet via the provided image url.\n2) use the web scraper tool to read webpages on the internet which may be relevant to the product.\n3) If after using these tools, you are still unable to determine the required product attributes then leave the data blank.\n\nUse all the information provided and gathered, to extract the following product attributes: title, description, model, material, color and condition.",
  "agent": "openAiFunctionsAgent",
  "options": {},
  "promptType": "define",
  "hasOutputParser": true
}
```

**Prompt/System Message**:
```
=system: Your role is to help an building surveyor perform a object classification and data collection task whereby the surveyor will take photos of various objects and your job is to try and identify accurately certain product attributes of the objects as detailed below.

The surveyor has given you the following:
1) photo url ```{{ $('Get Applicable Rows').item.json.Image[0].thumbnails.large.url }}```.
2) photo description ```{{ $json.content }}```.

For each product attribute the surveyor is unable to determine, you may:
1) use the reverse image search tool to search the product on the internet via the provided image url.
2) use the web scraper tool to read webpages on the internet which may be relevant to the product.
3) If after using these tools, you are still unable to determine the required product attributes then leave the data blank.

Use all the information provided and gathered, to extract the following product attributes: title, description, model, material, color and condition.
```

##### Example 4: AI Agent
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Extract insights & analyse YouTube comments via AI Agent chat.json`  
**Workflow**: Extract insights & analyse YouTube comments via AI Agent chat

**Configuration**:
```json
{
  "text": "={{ $('When chat message received').item.json.chatInput }}",
  "agent": "openAiFunctionsAgent",
  "options": {
    "systemMessage": "You are Youtube assistant. \nYou need to process user's requests and run relevant tools for that. \n\nPlan and execute in right order runs of tools to get data for user's request.\n\nIMPORTANT Search query and list of videos for channel tools returns all videos including shorts - use Get Video description tool to identify shorts (less than minute) and filter them out if needed.\n\nFeel free to ask questions before do actions - especially if you noticed some inconcistency in user requests that might be error/misspelling. "
  },
  "promptType": "define"
}
```

**Prompt/System Message**:
```
You are Youtube assistant. 
You need to process user's requests and run relevant tools for that. 

Plan and execute in right order runs of tools to get data for user's request.

IMPORTANT Search query and list of videos for channel tools returns all videos including shorts - use Get Video description tool to identify shorts (less than minute) and filter them out if needed.

Feel free to ask questions before do actions - especially if you noticed some inconcistency in user requests that might be error/misspelling. 
```

##### Example 5: AI Agent
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Generate SEO Seed Keywords Using AI.json`  
**Workflow**: Generate SEO Seed Keywords Using AI

**Configuration**:
```json
{
  "text": "=User:\nHere are some important rules for you to follow:\n<rules>\n1. Analyze the ICP information carefully.\n2. Generate 15-20 seed keywords that are relevant to the ICP's needs, challenges, goals, and search behavior.\n3. Ensure the keywords are broad enough to be considered \"\"head\"\" terms, but specific enough to target the ICP effectively.\n4. Consider various aspects of the ICP's journey, including awareness, consideration, and decision stages.\n5. Include a mix of product-related, problem-related, and solution-related terms.\n6. Think beyond just the product itself - consider industry trends, related technologies, and broader business concepts that would interest the ICP.\n7. Avoid overly generic terms that might attract irrelevant traffic.\n8. Aim for a mix of keyword difficulties, including both competitive and less competitive terms.\n9. Include keywords that cover different search intents: informational, navigational, commercial, and transactional.\n10. Consider related tools or platforms that the ICP might use, and include relevant integration-related keywords.\n11. If applicable, include some location-specific keywords based on the ICP's geographic information.\n12. Incorporate industry-specific terminology or jargon that the ICP would likely use in their searches.\n13. Consider emerging trends or pain points in the ICP's industry that they might be searching for solutions to.\n13. Format the keywords in lowercase, without punctuation. Trim any leading or trailing white space.\n</rules>\n\nYour output should be an array of strings, each representing a seed keyword:\n<example>\n['b2b lead generation', 'startup marketing strategies', 'saas sales funnel', ...]\n</example>\n\nHere is the Ideal Customer Profile (ICP) information:\n<input>\n{{ $json.data[0].product }}\n</input>\n\nNow:\nBased on the provided ICP, generate an array of 15-20 seed keywords that will form the foundation of a comprehensive SEO strategy for this B2B SaaS company. The
```

**Prompt/System Message**:
```
=System: You are an expert SEO strategist tasked with generating 15-20 key head search terms (seed keywords) for a B2B SaaS company. Your goal is to create a comprehensive list of keywords that will attract and engage the ideal customer profile (ICP) described.
```

**Prompt/System Message**:
```
=User:
Here are some important rules for you to follow:
<rules>
1. Analyze the ICP information carefully.
2. Generate 15-20 seed keywords that are relevant to the ICP's needs, challenges, goals, and search behavior.
3. Ensure the keywords are broad enough to be considered ""head"" terms, but specific enough to target the ICP effectively.
4. Consider various aspects of the ICP's journey, including awareness, consideration, and decision stages.
5. Include a mix of product-related, problem-related, and solution-related terms.
6. Think beyond just the product itself - consider industry trends, related technologies, and broader business concepts that would interest the ICP.
7. Avoid overly generic terms that might attract irrelevant traffic.
8. Aim for a mix of keyword difficulties, including both competitive and less competitive terms.
9. Include keywords that cover different search intents: informational, navigational, commercial, and transactional.
10. Consider related tools or platforms that the ICP might use, and include relevant integration-related keywords.
11. If applicable, include some location-specific keywords based on the ICP's geographic information.
12. Incorporate industry-specific terminology or jargon that the ICP would likely use in their searches.
13. Consider emerging trends or pain points in the ICP's industry that they might be searching for solutions to.
13. Format the keywords in lowercase, without punctuation. Trim any leading or trailing white space.
</r
```


---

### ChainLlm
**Type**: `@n8n/n8n-nodes-langchain.chainLlm`  
**Description**: Basic LLM chain that sends a prompt to a language model and returns the response. Supports prompt templates with variable injection.  
**Auth Required**: `none`  
**Usage Count**: 74 templates

#### Usage Examples

##### Example 1: Trun into structured data
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Hacker News Job Listing Scraper and Parser.json`  
**Workflow**: HN Who is Hiring Scrape

**Configuration**:
```json
{
  "text": "={{ $json.cleaned_text }}",
  "messages": {
    "messageValues": [
      {
        "message": "Extract the JSON data"
      }
    ]
  },
  "promptType": "define",
  "hasOutputParser": true
}
```

##### Example 2: Basic LLM Chain
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Learn Anything from HN - Get Top Resource Recommendations from Hacker News.json`  
**Workflow**: Learn Anything from HN - Get Top Resource Recommendations from Hacker News

**Configuration**:
```json
{
  "text": "=Your Task is to find the best resources to learn {{ $('GetTopicFromToLearn').item.json[\"I want to learn\"] }}. \n\nI have scraped the HackerNews and The following is the list of comments from HackerNews on topic about Learning {{ $('GetTopicFromToLearn').item.json[\"I want to learn\"] }}\n\n\nFocus only on comments that provide any resouces or advice or insight about learning {{ $('GetTopicFromToLearn').item.json.Learn }}. Ignore all other comments that are off topic discussions.\n\nNow based on these comments, you need to find the top resources and list them. \n\nCategorize them based on resource type (course, book, article, youtube videos, lectures, etc) and also figure out the difficultiy level (beginner, intermediate, advanced, expert).\n\nYou don't always to have fill in these categories exactly, these are given here for reference. Use your intution to find the best categorization.\n\nNow based on these metrics and running a basic sentiment analysis on comments you need to figure out what the top resources are. \n\nRespond back in Markdown formatted text. In the following format\n\n**OUTPUT FORMAT**\n\n```\n\n## Top HN Recomended Resources To Learn <topic Name> \n\n### Category 1\n\n- **Resource 1** - One line description\n- **Resource 2** - One line description\n- ... \n\n<add hyperlinks if any exists>\n\n### Category 2\n\n- **Resource 1** - One line description\n- **Resource 2** - One line description\n- ... \n\n<add hyperlinks in markdown format to the resource name itself if any exists. Example [resource name](https://example.com)>\n\n...\n```\n\nHere is the list of HackerNews Comments.\n\n{{ $json.text }}",
  "promptType": "define"
}
```

**Prompt/System Message**:
```
=Your Task is to find the best resources to learn {{ $('GetTopicFromToLearn').item.json["I want to learn"] }}. 

I have scraped the HackerNews and The following is the list of comments from HackerNews on topic about Learning {{ $('GetTopicFromToLearn').item.json["I want to learn"] }}


Focus only on comments that provide any resouces or advice or insight about learning {{ $('GetTopicFromToLearn').item.json.Learn }}. Ignore all other comments that are off topic discussions.

Now based on these comments, you need to find the top resources and list them. 

Categorize them based on resource type (course, book, article, youtube videos, lectures, etc) and also figure out the difficultiy level (beginner, intermediate, advanced, expert).

You don't always to have fill in these categories exactly, these are given here for reference. Use your intution to find the best categorization.

Now based on these metrics and running a basic sentiment analysis on comments you need to figure out what the top resources are. 

Respond back in Markdown formatted text. In the following format

**OUTPUT FORMAT**

```

## Top HN Recomended Resources To Learn <topic Name> 

### Category 1

- **Resource 1** - One line description
- **Resource 2** - One line description
- ... 

<add hyperlinks if any exists>

### Category 2

- **Resource 1** - One line description
- **Resource 2** - One line description
- ... 

<add hyperlinks in markdown format to the resource name itself if any exists. Example [resource 
```

##### Example 3: Generate Search Queries using LLM
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Open Deep Research - AI-Powered Autonomous Research Workflow.json`  
**Workflow**: Open Deep Research - AI-Powered Autonomous Research Workflow

**Configuration**:
```json
{
  "text": "=User Query: {{ $('Chat Message Trigger').item.json.chatInput }}",
  "messages": {
    "messageValues": [
      {
        "message": "=You are an expert research assistant. Given a user's query, generate up to four distinct, precise search queries that would help gather comprehensive information on the topic. Return only a JSON list of strings, for example: ['query1', 'query2', 'query3']."
      }
    ]
  },
  "promptType": "define"
}
```

##### Example 4: Assign labels for message
**Source**: `examples/Gmail_and_Email_Automation/Auto-label incoming Gmail messages with AI nodes.json`  
**Workflow**: Auto-label incoming Gmail messages with AI nodes

**Configuration**:
```json
{
  "prompt": "={{ $json.text }}",
  "messages": {
    "messageValues": [
      {
        "message": "Your task is to categorize the message according to the following labels.\n\nPartnership - email about sponsored content, cooperation etc.\nInquiry - email about products, services.\nNotification - email that doesn't require response. \n\nOne email can have more than one label. Return only label names in JSON format, nothing else. Do not make things up. "
      }
    ]
  }
}
```

##### Example 5: Categorize lemlist reply
**Source**: `examples/Gmail_and_Email_Automation/Classify lemlist replies using OpenAI and automate reply handling.json`  
**Workflow**: Classify lemlist replies using OpenAI and automate reply handling

**Configuration**:
```json
{
  "text": "=Classify the [email_content] in one only of the following categories: \n\nCategories=[\"Interested\", \"Out of office\", \"Unsubscribe\", \"Not interested\", \"Other\"] \n\n- Interested is when the reply is positive, and the person want more information or a meeting \n\nDon't output quotes like in the next example: \nemail_content_example:Hey I would like to know more \ncategory:Interested\n\nemail_content:\"{{ $json.textClean }}\" \n\nOnly answer with JSON in the following format:\n{\"replyStatus\":category}\n\nJSON:",
  "promptType": "define",
  "hasOutputParser": true
}
```

**Prompt/System Message**:
```
=Classify the [email_content] in one only of the following categories: 

Categories=["Interested", "Out of office", "Unsubscribe", "Not interested", "Other"] 

- Interested is when the reply is positive, and the person want more information or a meeting 

Don't output quotes like in the next example: 
email_content_example:Hey I would like to know more 
category:Interested

email_content:"{{ $json.textClean }}" 

Only answer with JSON in the following format:
{"replyStatus":category}

JSON:
```


---

### ChainRetrievalQa
**Type**: `@n8n/n8n-nodes-langchain.chainRetrievalQa`  
**Description**: Question-answering chain that retrieves relevant documents from a vector store before answering. Used in RAG pipelines.  
**Auth Required**: `none`  
**Usage Count**: 9 templates

#### Usage Examples

##### Example 1: Question and Answer Chain
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Build a Financial Documents Assistant using Qdrant and Mistral.ai.json`  
**Workflow**: Build a Financial Documents Assistant using Qdrant and Mistral.ai

##### Example 2: Question and Answer Chain
**Source**: `examples/Notion/Upsert huge documents in a vector store with Supabase and Notion.json`  
**Workflow**: RAG on living data

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 3: Retrieval QA Chain
**Source**: `examples/OpenAI_and_LLMs/AI Crew to Automate Fundamental Stock Analysis - Q&A Workflow.json`  
**Workflow**: Stock Q&A Workflow

**Configuration**:
```json
{
  "query": "={{ $json.body.input }}"
}
```

##### Example 4: Question and Answer Chain
**Source**: `examples/OpenAI_and_LLMs/Advanced AI Demo (Presented at AI Developers #14 meetup).json`  
**Workflow**: Advanced AI Demo (Presented at AI Developers #14 meetup)

**Configuration**:
```json
{
  "text": "={{ $json.chatInput }}. \nOnly use vector store knowledge to answer the question. Don't make anything up. If you don't know the answer, tell the user that you don't know.",
  "promptType": "define"
}
```

**Prompt/System Message**:
```
={{ $json.chatInput }}. 
Only use vector store knowledge to answer the question. Don't make anything up. If you don't know the answer, tell the user that you don't know.
```

##### Example 5: Question and Answer Chain
**Source**: `examples/Database_and_Storage/Supabase Insertion & Upsertion & Retrieval.json`  
**Workflow**: Supabase Insertion & Upsertion & Retrieval


---

### ChainSummarization
**Type**: `@n8n/n8n-nodes-langchain.chainSummarization`  
**Description**: Summarizes long documents or arrays of text using map-reduce or refine strategies.  
**Auth Required**: `none`  
**Usage Count**: 15 templates

#### Usage Examples

##### Example 1: Summarization Chain
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Scrape and summarize webpages with AI.json`  
**Workflow**: Scrape and summarize webpages with AI

**Configuration**:
```json
{
  "options": {},
  "operationMode": "documentLoader"
}
```

##### Example 2: Summarization Chain
**Source**: `examples/OpenAI_and_LLMs/AI Automated HR Workflow for CV Analysis and Candidate Evaluation.json`  
**Workflow**: HR-focused automation pipeline with AI

**Configuration**:
```json
{
  "options": {
    "summarizationMethodAndPrompts": {
      "values": {
        "prompt": "=Write a concise summary of the following:\n\nCity: {{ $json.output.city }}\nBirthdate: {{ $json.output.birthdate }}\nEducational qualification: {{ $json.output[\"Educational qualification\"] }}\nJob History: {{ $json.output[\"Job History\"] }}\nSkills: {{ $json.output.Skills }}\n\nUse 100 words or less. Be concise and conversational.",
        "combineMapPrompt": "=Write a concise summary of the following:\n\nCity: {{ $json.output.city }}\nBirthdate: {{ $json.output.birthdate }}\nEducational qualification: {{ $json.output[\"Educational qualification\"] }}\nJob History: {{ $json.output[\"Job History\"] }}\nSkills: {{ $json.output.Skills }}\n\nUse 100 words or less. Be concise and conversational."
      }
    }
  }
}
```

##### Example 3: Summarize Transcript
**Source**: `examples/OpenAI_and_LLMs/AI_ Summarize podcast episode and enhance using Wikipedia.json`  
**Workflow**: Podcast Digest

**Configuration**:
```json
{
  "type": "refine"
}
```

##### Example 4: Summarization Chain
**Source**: `examples/PDF_and_Document_Processing/Breakdown Documents into Study Notes using Templating MistralAI and Qdrant.json`  
**Workflow**: Breakdown Documents into Study Notes using Templating MistralAI and Qdrant

**Configuration**:
```json
{
  "options": {},
  "chunkSize": 4000
}
```

##### Example 5: Translate the Story to Arabic
**Source**: `examples/Telegram/AI-Powered Children_s Arabic Storytelling on Telegram.json`  
**Workflow**: AI-Powered Children_s Arabic Storytelling on Telegram

**Configuration**:
```json
{
  "options": {
    "summarizationMethodAndPrompts": {
      "values": {
        "prompt": "Translate this story texts to \"Arabic\" and make it easy to understands for kids with easy words and moral lesson :\n\n\n\"{text}\"\n\n\n",
        "summarizationMethod": "stuff"
      }
    }
  },
  "chunkingMode": "advanced"
}
```


---

### OpenAiAssistant
**Type**: `@n8n/n8n-nodes-langchain.openAiAssistant`  
**Description**: Runs an OpenAI Assistant (Assistants API v2) with thread management and tool calling.  
**Auth Required**: `openAiApi`  
**Usage Count**: 2 templates

#### Usage Examples

##### Example 1: OpenAI Assistant
**Source**: `examples/OpenAI_and_LLMs/Chat with OpenAI Assistant (by adding a memory).json`  
**Workflow**: Chat with OpenAI Assistant (by adding a memory)

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "text": "=## Our Previous Conversation:\n{{ $json[\"messages\"].map(m => `\nHuman: ${m.human}\nAI Assistant: ${m.ai}\n`) }}\n## Current message:\n{{ $('Chat Trigger').item.json.chatInput }}",
  "options": {},
  "assistantId": "asst_HDSAnzsp4WqY4UC1iI9auH5z"
}
```

**Prompt/System Message**:
```
=## Our Previous Conversation:
{{ $json["messages"].map(m => `
Human: ${m.human}
AI Assistant: ${m.ai}
`) }}
## Current message:
{{ $('Chat Trigger').item.json.chatInput }}
```

##### Example 2: OpenAI Assistant
**Source**: `examples/OpenAI_and_LLMs/OpenAI assistant with custom tools.json`  
**Workflow**: OpenAI Assistant with custom n8n tools

**Credentials**: `{{CREDENTIAL_openAiApi}}`

**Configuration**:
```json
{
  "options": {},
  "assistantId": "asst_BWy0154vMGMdrX7MjCYaYv6a"
}
```


---

### SentimentAnalysis
**Type**: `@n8n/n8n-nodes-langchain.sentimentAnalysis`  
**Description**: Classifies text sentiment as positive, negative, or neutral using a connected LLM.  
**Auth Required**: `none`  
**Usage Count**: 2 templates

#### Usage Examples

##### Example 1: Sentiment Analysis
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Scrape Trustpilot Reviews with DeepSeek, Analyze Sentiment with OpenAI.json`  
**Workflow**: Scrape Trustpilot Reviews with DeepSeek, Analyze Sentiment with OpenAI

**Configuration**:
```json
{
  "options": {
    "categories": "Positive, Neutral, Negative",
    "systemPromptTemplate": "You are highly intelligent and accurate sentiment analyzer. Analyze the sentiment of the provided text. Categorize it into one of the following: {categories}. Use the provided formatting instructions. Only output the JSON."
  },
  "inputText": "={{ $json.output.testo }}"
}
```

##### Example 2: Customer Satisfaction Agent
**Source**: `examples/OpenAI_and_LLMs/Automate Customer Support Issue Resolution using AI Text Classifier.json`  
**Workflow**: Automate Customer Support Issue Resolution using AI Text Classifier

**Configuration**:
```json
{
  "options": {},
  "inputText": "=issue:\n{{ $('Simplify Thread For AI').item.json.topic }}\n\ncomments:\n{{ $('Simplify Thread For AI').item.json.thread.join('\\n') }}"
}
```


---

### TextClassifier
**Type**: `@n8n/n8n-nodes-langchain.textClassifier`  
**Description**: Routes items into named categories based on LLM classification. Replaces Switch nodes for text-based routing.  
**Auth Required**: `none`  
**Usage Count**: 15 templates

#### Usage Examples

##### Example 1: Classify Document
**Source**: `examples/Airtable/Handling Job Application Submissions with AI and n8n Forms.json`  
**Workflow**: Handling Job Application Submissions with AI and n8n Forms

**Configuration**:
```json
{
  "options": {
    "fallback": "other"
  },
  "inputText": "={{ $json.text }}",
  "categories": {
    "categories": [
      {
        "category": "CV or Resume",
        "description": "This document is a CV or Resume"
      }
    ]
  }
}
```

##### Example 2: Enquiry Classifier
**Source**: `examples/Forms_and_Surveys/Qualifying Appointment Requests with AI & n8n Forms.json`  
**Workflow**: Qualifying Appointment Requests with AI & n8n Forms

**Configuration**:
```json
{
  "options": {
    "fallback": "other"
  },
  "inputText": "={{ $json.Enquiry }}",
  "categories": {
    "categories": [
      {
        "category": "relevant enquiry",
        "description": "Enquire about AI, automation, digital products and product engineering."
      }
    ]
  }
}
```

##### Example 3: Text Classifier
**Source**: `examples/Gmail_and_Email_Automation/Effortless Email Management with AI-Powered Summarization & Review.json`  
**Workflow**: Effortless Email Management with AI

**Configuration**:
```json
{
  "options": {
    "systemPromptTemplate": "Please classify the text provided by the user into one of the following categories: {categories}, and use the provided formatting instructions below. Don't explain, and only output the json."
  },
  "inputText": "={{ $json.data.text }}",
  "categories": {
    "categories": [
      {
        "category": "Approved",
        "description": "The email has been reviewed and accepted as-is. The human explicitly or implicity express approva, indicating that no changes ar needed.\n\nExample:\n\"Ok\",\n\"Approvato\",\n\"Invia\""
      },
      {
        "category": "Declined",
        "description": "The email has been reviewd, but the human request modifications before it sent link tweaks, removing parts, rewording etc... This could include suggested edits, rewording or major revision."
      }
    ]
  }
}
```

##### Example 4: Text Classifier
**Source**: `examples/Gmail_and_Email_Automation/Modular & Customizable AI-Powered Email Routing_ Text Classifier for eCommerce.json`  
**Workflow**: Contact Form Text Classifier for eCommerce

**Configuration**:
```json
{
  "options": {
    "fallback": "other",
    "systemPromptTemplate": "=Please classify the text provided by the user into one of the following categories: {categories}, and use the provided formatting instructions below. Don't explain, and only output the json with the selected {categories}."
  },
  "inputText": "={{ $json.Message }}",
  "categories": {
    "categories": [
      {
        "category": "Request Quote",
        "description": "Request for quote"
      },
      {
        "category": "Product info",
        "description": "General information about a product"
      },
      {
        "category": "General problem",
        "description": "General problems about a product"
      },
      {
        "category": "Order",
        "description": "Information about an order placed"
      }
    ]
  }
}
```

##### Example 5: Text Classifier
**Source**: `examples/HR_and_Recruitment/BambooHR AI-Powered Company Policies and Benefits Chatbot.json`  
**Workflow**: BambooHR AI-Powered Company Policies and Benefits Chatbot

**Configuration**:
```json
{
  "options": {},
  "inputText": "={{ $json.query.name }}",
  "categories": {
    "categories": [
      {
        "category": "person",
        "description": "This is the name of a person."
      },
      {
        "category": "department",
        "description": "This is the name of a department within the company."
      }
    ]
  }
}
```


---

### InformationExtractor
**Type**: `@n8n/n8n-nodes-langchain.informationExtractor`  
**Description**: Extracts structured fields from unstructured text using a JSON schema and a connected LLM.  
**Auth Required**: `none`  
**Usage Count**: 26 templates

#### Usage Examples

##### Example 1: Customer Insights Agent
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Customer Insights with Qdrant, Python and Information Extractor.json`  
**Workflow**: Customer Insights with Qdrant, Python and Information Extractor

**Configuration**:
```json
{
  "text": "=The {{ $json.result.length }} reviews were:\n{{\n$json.result.map(item =>\n`* ${item.payload.metadata.review_author} gave ${item.payload.metadata.review_rating} stars: \"${item.payload.content.replaceAll('\"', '\\\"').replaceAll('\\n', ' ')}\"`\n).join('\\n')\n}}",
  "options": {
    "systemPromptTemplate": "=You help summarise a selection of trustpilot reviews for a company called \"{{ $json.result[0].payload.metadata.company_id }}\".\nThe {{ $json.result.length }} reviews were selected because their contents were similar in context.\n\nYour task is to: \n* summarise the given reviews into a short paragraph. Provide an insight from this summary and what we could learn from the reviews.\n* determine if the overall sentiment of all the listed responses to be either strongly negative, negative, neutral, positive or strongly positive."
  },
  "schemaType": "fromJson",
  "jsonSchemaExample": "{\n\t\"Insight\": \"\",\n \"Sentiment\": \"\",\n \"Suggested Improvements\": \"\"\n}"
}
```

**Prompt/System Message**:
```
=The {{ $json.result.length }} reviews were:
{{
$json.result.map(item =>
`* ${item.payload.metadata.review_author} gave ${item.payload.metadata.review_rating} stars: "${item.payload.content.replaceAll('"', '\"').replaceAll('\n', ' ')}"`
).join('\n')
}}
```

##### Example 2: Summarize Synopsis
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Deduplicate Scraping AI Grants for Eligibility using AI.json`  
**Workflow**: Deduplicate Scraping AI Grants for Eligibility using AI

**Configuration**:
```json
{
  "text": "=Agency: {{ $json.synopsis.agencyName }}\nTitle: {{ $json.opportunityTitle }}\nSynopsis: {{ $json.synopsis.synopsisDesc }}",
  "options": {
    "systemPromptTemplate": "You've been given a grant opportunity listing. Help summarize the opportunity in simple terms."
  },
  "schemaType": "manual",
  "inputSchema": "{\n\t\"type\": \"object\",\n\t\"properties\": {\n \"goal\": { \"type\": [\"string\", \"null\"] },\n \"duration\": { \"type\": \"string\" },\n \"success_criteria\": {\n \"type\": \"array\",\n \"items\": { \"type\": \"string\" }\n },\n \"good_to_know\": {\n\t\t \"type\": \"array\",\n \"items\": { \"type\": \"string\" }\n }\n\t}\n}"
}
```

**Prompt/System Message**:
```
=Agency: {{ $json.synopsis.agencyName }}
Title: {{ $json.opportunityTitle }}
Synopsis: {{ $json.synopsis.synopsisDesc }}
```

##### Example 3: Information Extractor
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Scrape Trustpilot Reviews with DeepSeek, Analyze Sentiment with OpenAI.json`  
**Workflow**: Scrape Trustpilot Reviews with DeepSeek, Analyze Sentiment with OpenAI

**Configuration**:
```json
{
  "text": "=You need to extract the review from the following HTML: {{ $json.recensione }}",
  "options": {
    "systemPromptTemplate": "You are a review expert. You need to extract only the required information and report it without changing anything.\nAll the required information is in the text."
  },
  "attributes": {
    "attributes": [
      {
        "name": "autore",
        "required": true,
        "description": "Extract the name of the review author"
      },
      {
        "name": "valutazione",
        "type": "number",
        "required": true,
        "description": "Extract the rating given to the review (from 1 to 5)"
      },
      {
        "name": "data",
        "required": true,
        "description": "Extract review date in YYYY-MM-DD format"
      },
      {
        "name": "titolo",
        "required": true,
        "description": "Extract the review title"
      },
      {
        "name": "testo",
        "required": true,
        "description": "Extract the review text"
      },
      {
        "name": "n_recensioni",
        "type": "number",
        "required": true,
        "description": "Extract the total number of reviews made by the user"
      },
      {
        "name": "nazione",
        "required": true,
        "description": "Extract the country of the user who wrote the review. Must be two characters"
      }
    ]
  }
}
```

##### Example 4: Eligibility Factors
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Deduplicate Scraping AI Grants for Eligibility using AI.json`  
**Workflow**: Deduplicate Scraping AI Grants for Eligibility using AI

**Configuration**:
```json
{
  "text": "=Agency: {{ $json.synopsis.agencyName }}\nTitle: {{ $json.opportunityTitle }}\nSynopsis: {{ $json.synopsis.synopsisDesc }}\nEligibility: {{ $json.synopsis.applicantEligibilityDesc }}",
  "options": {
    "systemPromptTemplate": "Help determine if we are eligible for this grant.\n\nWe are AI Consultants Limited (“Company”) and are the controllers of your personal data. Our registered office is Unit 29, Intelligent Park, Milton Road, Cambridge Cambridgeshire CB9 RDW, and our registered company number is 1234567.\n\nWe are part of a group of companies which provides consultancy services across the globe. Our other group companies are:\n\nAI Consultants Inc. of 2 Drydock Avenue, Suite 1210, Boston, MA 02210, USA\nAI Consultants (Singapore) Pte Ltd of 300 Beach Road, Singapore 199555\nAI Consultants Japan Inc, of 3-1-3 Minamiaoyama, Minato-ku, Tokyo, 107-0062\nIn the UK we are registered with the Information Commissioner’s Office under registration number Z9888888.\n\nIn the US we are registered with the Data Privacy Framework Program (DPF). To view the Company’s certification, please visit https://www.dataprivacyframework.gov/list.\n\nWe are a leading, worldwide product development service provider. We specialise in design engineering services, professional technical services and product technical support services (“Services”).\n\nAs the deep tech powerhouse of Capgemini, CC spearheads transformative projects to solve the toughest scientific and engineering challenges. Ambitious clients collaborate with us to create new-to-the-world technologies, services and products that have never been seen before. Our unique combination of technical, commercial and market expertise yields market-leading solutions that are hard to copy. This creates valuable intellectual property that generates protectable long-term value.\n\nWe work with some of the world’s biggest brands and most ambitious technology start-up ventures across a wide range of markets. From aerospace to a
```

**Prompt/System Message**:
```
=Agency: {{ $json.synopsis.agencyName }}
Title: {{ $json.opportunityTitle }}
Synopsis: {{ $json.synopsis.synopsisDesc }}
Eligibility: {{ $json.synopsis.applicantEligibilityDesc }}
```

##### Example 5: Extract overall ratings and distribution percentages
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Spot Workplace Discrimination Patterns with AI.json`  
**Workflow**: Spot Workplace Discrimination Patterns with AI

**Configuration**:
```json
{
  "text": "={{ $json.review_summary }}",
  "options": {},
  "attributes": {
    "attributes": [
      {
        "name": "average_rating",
        "type": "number",
        "required": true,
        "description": "The overall average rating for this company."
      },
      {
        "name": "total_number_of_reviews",
        "type": "number",
        "required": true,
        "description": "The total number of reviews for this company."
      },
      {
        "name": "5_star_distribution_percentage",
        "type": "number",
        "required": true,
        "description": "The percentage distribution of 5 star reviews"
      },
      {
        "name": "4_star_distribution_percentage",
        "type": "number",
        "required": true,
        "description": "The percentage distribution of 4 star reviews"
      },
      {
        "name": "3_star_distribution_percentage",
        "type": "number",
        "required": true,
        "description": "The percentage distribution of 3 star reviews"
      },
      {
        "name": "2_star_distribution_percentage",
        "type": "number",
        "required": true,
        "description": "The percentage distribution of 2 star reviews"
      },
      {
        "name": "1_star_distribution_percentage",
        "type": "number",
        "required": true,
        "description": "The percentage distribution of 1 star reviews"
      }
    ]
  }
}
```


---

### OutputParserStructured
**Type**: `@n8n/n8n-nodes-langchain.outputParserStructured`  
**Description**: Parses LLM output into a validated JSON object using a Zod or JSON schema. Attach to chainLlm or agent.  
**Auth Required**: `none`  
**Usage Count**: 54 templates

#### Usage Examples

##### Example 1: JSON Parser
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Autonomous AI crawler.json`  
**Workflow**: Autonomous AI crawler

**Configuration**:
```json
{
  "schemaType": "manual",
  "inputSchema": "{\n \"type\": \"object\",\n \"properties\": {\n \"social_media\": {\n \"type\": \"array\",\n \"items\": {\n \"type\": \"object\",\n \"properties\": {\n \"platform\": {\n \"type\": \"string\",\n \"description\": \"The name of the social media platform (e.g., LinkedIn, Instagram)\"\n },\n \"urls\": {\n \"type\": \"array\",\n \"items\": {\n \"type\": \"string\",\n \"format\": \"uri\",\n \"description\": \"A URL for the social media platform\"\n }\n }\n },\n \"required\": [\"platform\", \"urls\"],\n \"additionalProperties\": false\n }\n }\n },\n \"required\": [\"platforms\"],\n \"additionalProperties\": false\n}\n",
  "requestOptions": {}
}
```

##### Example 2: Structured Output Parser
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Enrich Property Inventory Survey with Image Recognition and AI Agent.json`  
**Workflow**: Enrich Property Inventory Survey with Image Recognition and AI Agent

**Configuration**:
```json
{
  "jsonSchema": "{\n \"type\": \"object\",\n \"properties\": {\n \"title\": { \"type\": \"string\" },\n \"description\": { \"type\": \"string\" },\n \"model\": { \"type\": \"string\" },\n \"material\": { \"type\": \"string\" },\n \"color\": { \"type\": \"string\" },\n \"condition\": { \"type\": \"string\" }\n }\n}"
}
```

##### Example 3: Structured Output Parser
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Hacker News Job Listing Scraper and Parser.json`  
**Workflow**: HN Who is Hiring Scrape

**Configuration**:
```json
{
  "schemaType": "manual",
  "inputSchema": "{\n \"type\": \"object\",\n \"properties\": {\n \"company\": {\n \"type\": [\n \"string\",\n null\n ],\n \"description\": \"Name of the hiring company\"\n },\n \"title\": {\n \"type\": [\n \"string\",\n null\n ],\n \"description\": \"Job title/role being advertised\"\n },\n \"location\": {\n \"type\": [\n \"string\",\n null\n ],\n \"description\": \"Work location including remote/hybrid status\"\n },\n \"type\": {\n \"type\": [\n \"string\",\n null\n ],\n \"enum\": [\n \"FULL_TIME\",\n \"PART_TIME\",\n \"CONTRACT\",\n \"INTERNSHIP\",\n \"FREELANCE\",\n null\n ],\n \"description\": \"Employment type (Full-time, Contract, etc)\"\n },\n \"work_location\": {\n \"type\": [\n \"string\",\n null\n ],\n \"enum\": [\n \"REMOTE\",\n \"HYBRID\",\n \"ON_SITE\",\n null\n ],\n \"description\": \"Work arrangement type\"\n },\n \"salary\": {\n \"type\": [\n \"string\",\n null\n ],\n \"description\": \"Compensation details if provided\"\n },\n \"description\": {\n \"type\": [\n \"string\",\n null\n ],\n \"description\": \"Main job description text including requirements and team info\"\n },\n \"apply_url\": {\n \"type\": [\n \"string\",\n null\n ],\n \"description\": \"Direct application/job posting URL\"\n },\n \"company_url\": {\n \"type\": [\n \"string\",\n null\n ],\n \"description\": \"Company website or careers page\"\n }\n }\n}\n"
}
```

##### Example 4: Structured Output Parser1
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Intelligent Web Query and Semantic Re-Ranking Flow using Brave and Google Gemini.json`  
**Workflow**: Intelligent Web Query and Semantic Re-Ranking Flow

**Configuration**:
```json
{
  "jsonSchemaExample": "{\n \"reasoning_summary\": \"Detailed explanation of each analytical chain’s purpose and insights, including key terms and considerations for query formulation.\",\n \"final_search_query\": \"The single, best-fit search query derived from the meta-reasoning and multi-chain analysis, optimized to answer the research question.\"\n}"
}
```

##### Example 5: Structured Output Parser
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Hacker News to Video Content.json`  
**Workflow**: Hacker News to Video Template - AlexK1919

**Configuration**:
```json
{
  "schemaType": "manual",
  "inputSchema": "{\n\t\"type\": \"object\",\n\t\"properties\": {\n\t\t\"summary\": {\n\t\t\t\"type\": \"string\"\n\t\t},\n\t\t\"related\": {\n\t\t\t\"type\": \"string\"\n\t\t},\n \"image urls\": {\n\t\t\t\"type\": \"string\"\n }\n\t}\n}"
}
```


---

### OutputParserAutofixing
**Type**: `@n8n/n8n-nodes-langchain.outputParserAutofixing`  
**Description**: Wraps another output parser with automatic retry-and-fix on parse failures.  
**Auth Required**: `none`  
**Usage Count**: 12 templates

#### Usage Examples

##### Example 1: Auto-fixing Output Parser6
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Intelligent Web Query and Semantic Re-Ranking Flow using Brave and Google Gemini.json`  
**Workflow**: Intelligent Web Query and Semantic Re-Ranking Flow

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 2: Auto-fixing Output Parser
**Source**: `examples/HR_and_Recruitment/BambooHR AI-Powered Company Policies and Benefits Chatbot.json`  
**Workflow**: BambooHR AI-Powered Company Policies and Benefits Chatbot

##### Example 3: Auto-fixing Output Parser
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Intelligent Web Query and Semantic Re-Ranking Flow using Brave and Google Gemini.json`  
**Workflow**: Intelligent Web Query and Semantic Re-Ranking Flow

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 4: Auto-fixing Output Parser
**Source**: `examples/Notion/Notion AI Assistant Generator.json`  
**Workflow**: Notion AI Assistant Generator

##### Example 5: Auto-fixing Output Parser
**Source**: `examples/OpenAI_and_LLMs/Extract personal data with self-hosted LLM Mistral NeMo.json`  
**Workflow**: Extract personal data with a self-hosted LLM Mistral NeMo

**Configuration**:
```json
{
  "options": {
    "prompt": "Instructions:\n--------------\n{instructions}\n--------------\nCompletion:\n--------------\n{completion}\n--------------\n\nAbove, the Completion did not satisfy the constraints given in the Instructions.\nError:\n--------------\n{error}\n--------------\n\nPlease try again. Please only respond with an answer that satisfies the constraints laid out in the Instructions:"
  }
}
```

**Prompt/System Message**:
```
Instructions:
--------------
{instructions}
--------------
Completion:
--------------
{completion}
--------------

Above, the Completion did not satisfy the constraints given in the Instructions.
Error:
--------------
{error}
--------------

Please try again. Please only respond with an answer that satisfies the constraints laid out in the Instructions:
```


---

### OutputParserItemList
**Type**: `@n8n/n8n-nodes-langchain.outputParserItemList`  
**Description**: Parses a comma-separated or newline-delimited LLM output into an array of items.  
**Auth Required**: `none`  
**Usage Count**: 2 templates

#### Usage Examples

##### Example 1: Item List Output Parser
**Source**: `examples/OpenAI_and_LLMs/Automate Your RFP Process with OpenAI Assistants.json`  
**Workflow**: Automate Your RFP Process with OpenAI Assistants

**Configuration**:
```json
{
  "options": {}
}
```

##### Example 2: Item List Output Parser
**Source**: `examples/PDF_and_Document_Processing/Breakdown Documents into Study Notes using Templating MistralAI and Qdrant.json`  
**Workflow**: Breakdown Documents into Study Notes using Templating MistralAI and Qdrant

**Configuration**:
```json
{
  "options": {}
}
```

