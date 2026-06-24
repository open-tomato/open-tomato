---
tags: [n8n, social-media, twitter, linkedin, youtube, instagram, facebook, spotify]
category: social-media
description: Post content and read data from social platforms
---

# Social Media

## Overview
Post content and read data from social platforms.

## Nodes in This Category

---

### Twitter
**Type**: `n8n-nodes-base.twitter`  
**Description**: Post tweets, search tweets, and manage a Twitter/X account.  
**Auth Required**: `twitterOAuth1Api`, `twitterOAuth2Api`  
**Usage Count**: 7 templates

#### Common Operations/Modes
- `search`

#### Usage Examples

##### Example 1: X
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Hacker News to Video Content.json`  
**Workflow**: Hacker News to Video Template - AlexK1919

**Configuration**:
```json
{
  "additionalFields": {}
}
```

##### Example 2: X Post
**Source**: `examples/Instagram_Twitter_Social_Media/Automate multi-platform Social Media Content Creation with AI.json`  
**Workflow**: ✨🤖Automated AI Powered Social Media Content Factory for  X + Facebook + Instagram + LinkedIn

**Credentials**: `{{CREDENTIAL_twitterOAuth2Api}}`

**Configuration**:
```json
{
  "text": "={{ $('Social Media Content Factory').item.json.output.platform_posts['X-Twitter'].post }}",
  "additionalFields": {}
}
```

**Prompt/System Message**:
```
={{ $('Social Media Content Factory').item.json.output.platform_posts['X-Twitter'].post }}
```

##### Example 3: Search Tweets
**Source**: `examples/Other_Integrations_and_Use_Cases/Automate testimonials in Strapi with n8n.json`  
**Workflow**: Automate testimonials in Strapi with n8n

**Credentials**: `{{CREDENTIAL_twitterOAuth1Api}}`

**Configuration**:
```json
{
  "operation": "search",
  "searchText": "(strapi OR n8n.io) AND lang:en",
  "additionalFields": {
    "tweetMode": "extended",
    "resultType": "recent"
  }
}
```

##### Example 4: Twitter
**Source**: `examples/PDF_and_Document_Processing/ETL pipeline for text processing.json`  
**Workflow**: ETL pipeline

**Credentials**: `{{CREDENTIAL_twitterOAuth1Api}}`

**Configuration**:
```json
{
  "limit": 3,
  "operation": "search",
  "searchText": "=#OnThisDay",
  "additionalFields": {}
}
```

##### Example 5: Post to X
**Source**: `examples/Instagram_Twitter_Social_Media/Post New YouTube Videos to X.json`  
**Workflow**: Post New YouTube Videos to X

**Credentials**: `{{CREDENTIAL_twitterOAuth2Api}}`

**Configuration**:
```json
{
  "text": "={{ $json.message.content }}",
  "additionalFields": {}
}
```


---

### LinkedIn
**Type**: `n8n-nodes-base.linkedIn`  
**Description**: Post articles and updates on LinkedIn.  
**Auth Required**: `linkedInOAuth2Api`  
**Usage Count**: 5 templates

#### Usage Examples

##### Example 1: LinkedIn
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Hacker News to Video Content.json`  
**Workflow**: Hacker News to Video Template - AlexK1919

**Configuration**:
```json
{
  "additionalFields": {}
}
```

##### Example 2: LinkedIn Post
**Source**: `examples/Instagram_Twitter_Social_Media/Automate multi-platform Social Media Content Creation with AI.json`  
**Workflow**: ✨🤖Automated AI Powered Social Media Content Factory for  X + Facebook + Instagram + LinkedIn

**Credentials**: `{{CREDENTIAL_linkedInOAuth2Api}}`

**Configuration**:
```json
{
  "text": "={{ $('Social Media Content Factory').item.json.output.platform_posts.LinkedIn.post }}\n{{ $('Social Media Content Factory').item.json.output.platform_posts.LinkedIn.call_to_action }}\n{{ $('Social Media Content Factory').item.json.output.platform_posts.LinkedIn.hashtags }}\n{{ $('Social Media Content Factory').item.json.output.platform_posts.LinkedIn.call_to_action }}",
  "postAs": "organization",
  "organization": "12345678",
  "additionalFields": {},
  "binaryPropertyName": "=data",
  "shareMediaCategory": "IMAGE"
}
```

**Prompt/System Message**:
```
={{ $('Social Media Content Factory').item.json.output.platform_posts.LinkedIn.post }}
{{ $('Social Media Content Factory').item.json.output.platform_posts.LinkedIn.call_to_action }}
{{ $('Social Media Content Factory').item.json.output.platform_posts.LinkedIn.hashtags }}
{{ $('Social Media Content Factory').item.json.output.platform_posts.LinkedIn.call_to_action }}
```

##### Example 3: Publish Post
**Source**: `examples/LinkedIn/content_creator.json`  
**Workflow**: content_creator

**Credentials**: `{{CREDENTIAL_linkedInOAuth2Api}}`

**Configuration**:
```json
{
  "text": "={{ $json.text }}",
  "person": "rBxbEv1ziJ",
  "additionalFields": {
    "visibility": "PUBLIC"
  },
  "shareMediaCategory": "IMAGE"
}
```

##### Example 4: Post on LinkedIn
**Source**: `examples/Notion/Automate LinkedIn Outreach with Notion and OpenAI.json`  
**Workflow**: Automate LinkedIn Posts with AI

**Credentials**: `{{CREDENTIAL_linkedInOAuth2Api}}`

**Configuration**:
```json
{
  "text": "={{ $json.output }}",
  "person": "_RmSSZc0jB",
  "additionalFields": {},
  "shareMediaCategory": "IMAGE"
}
```

##### Example 5: LinkedIn
**Source**: `examples/OpenAI_and_LLMs/AI-Powered Social Media Amplifier.json`  
**Workflow**: Social Media AI Agent - Telegram

**Credentials**: `{{CREDENTIAL_linkedInOAuth2Api}}`

**Configuration**:
```json
{
  "text": "={{ $('Filter Errored').item.json.message.content.linkedin }}",
  "person": "afi4Hy9wlI",
  "additionalFields": {}
}
```


---

### YouTube
**Type**: `n8n-nodes-base.youTube`  
**Description**: Upload videos, manage playlists and retrieve YouTube data.  
**Auth Required**: `youTubeOAuth2Api`  
**Usage Count**: 4 templates

#### Common Operations/Modes
- `get`
- `upload`
- `video`

#### Usage Examples

##### Example 1: YouTube
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Hacker News to Video Content.json`  
**Workflow**: Hacker News to Video Template - AlexK1919

**Configuration**:
```json
{
  "options": {},
  "resource": "video",
  "operation": "upload"
}
```

##### Example 2: Fetch Latest Videos
**Source**: `examples/Instagram_Twitter_Social_Media/Post New YouTube Videos to X.json`  
**Workflow**: Post New YouTube Videos to X

**Credentials**: `{{CREDENTIAL_youTubeOAuth2Api}}`

**Configuration**:
```json
{
  "limit": 1,
  "filters": {
    "channelId": "UC08Fah8EIryeOZRkjBRohcQ",
    "publishedAfter": "={{ new Date(new Date().getTime() - 30 * 60000).toISOString() }}"
  },
  "options": {},
  "resource": "video"
}
```

##### Example 3: get_videos1
**Source**: `examples/OpenAI_and_LLMs/AI Youtube Trend Finder Based On Niche.json`  
**Workflow**: Complete Youtube

**Credentials**: `{{CREDENTIAL_youTubeOAuth2Api}}`

**Configuration**:
```json
{
  "limit": 3,
  "filters": {
    "q": "={{ $json.query.search_term }}",
    "regionCode": "US",
    "publishedAfter": "={{ new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() }}"
  },
  "options": {
    "order": "relevance",
    "safeSearch": "moderate"
  },
  "resource": "video"
}
```

##### Example 4: Get YouTube Video
**Source**: `examples/OpenAI_and_LLMs/⚡AI-Powered YouTube Video Summarization & Analysis.json`  
**Workflow**: ⚡AI-Powered YouTube Video Summarization & Analysis

**Configuration**:
```json
{
  "options": {},
  "videoId": "={{ $json.videoId }}",
  "resource": "video",
  "operation": "get"
}
```


---

### Spotify
**Type**: `n8n-nodes-base.spotify`  
**Description**: n8n node for spotify operations.  
**Auth Required**: `spotifyOAuth2Api`  
**Usage Count**: 8 templates

#### Common Operations/Modes
- `currentlyPlaying`
- `getUserPlaylists`
- `library`
- `nextSong`
- `playlist`
- `resume`
- `search`

#### Usage Examples

##### Example 1: Get Playlist
**Source**: `examples/Other_Integrations_and_Use_Cases/Monthly Spotify Track Archiving and Playlist Classification.json`  
**Workflow**: Monthly Spotify Track Archiving and Playlist Classification

**Credentials**: `{{CREDENTIAL_spotifyOAuth2Api}}`

**Configuration**:
```json
{
  "resource": "playlist",
  "operation": "getUserPlaylists"
}
```

##### Example 2: Get Tracks
**Source**: `examples/Other_Integrations_and_Use_Cases/Monthly Spotify Track Archiving and Playlist Classification.json`  
**Workflow**: Monthly Spotify Track Archiving and Playlist Classification

**Credentials**: `{{CREDENTIAL_spotifyOAuth2Api}}`

**Configuration**:
```json
{
  "resource": "library",
  "returnAll": true
}
```

##### Example 3: Spotify
**Source**: `examples/Other_Integrations_and_Use_Cases/Monthly Spotify Track Archiving and Playlist Classification.json`  
**Workflow**: Monthly Spotify Track Archiving and Playlist Classification

**Credentials**: `{{CREDENTIAL_spotifyOAuth2Api}}`

**Configuration**:
```json
{
  "trackID": "={{ $json.trackUris.join(\",\") }}",
  "resource": "playlist",
  "additionalFields": {}
}
```

##### Example 4: Search track
**Source**: `examples/Telegram/Telegram to Spotify with OpenAI.json`  
**Workflow**: Play with Spotify from Telegram

**Credentials**: `{{CREDENTIAL_spotifyOAuth2Api}}`

**Configuration**:
```json
{
  "limit": 1,
  "query": "={{ $json.message.content }}",
  "filters": {},
  "resource": "track",
  "operation": "search"
}
```

##### Example 5: Add song
**Source**: `examples/Telegram/Telegram to Spotify with OpenAI.json`  
**Workflow**: Play with Spotify from Telegram

**Credentials**: `{{CREDENTIAL_spotifyOAuth2Api}}`


---

### FacebookGraphApi
**Type**: `n8n-nodes-base.facebookGraphApi`  
**Description**: n8n node for facebookGraphApi operations.  
**Auth Required**: `facebookGraphApi`  
**Usage Count**: 6 templates

#### Usage Examples

##### Example 1: Instragram Post
**Source**: `examples/Instagram_Twitter_Social_Media/Automate multi-platform Social Media Content Creation with AI.json`  
**Workflow**: ✨🤖Automated AI Powered Social Media Content Factory for  X + Facebook + Instagram + LinkedIn

**Credentials**: `{{CREDENTIAL_facebookGraphApi}}`

**Configuration**:
```json
{
  "edge": "media_publish",
  "node": "[your-unique-id]",
  "options": {
    "queryParameters": {
      "parameter": [
        {
          "name": "creation_id",
          "value": "={{ $json.id }}"
        },
        {
          "name": "caption",
          "value": "={{ $('Social Media Content Factory').item.json.output.platform_posts.Instagram.caption }}"
        }
      ]
    }
  },
  "graphApiVersion": "v20.0",
  "httpRequestMethod": "POST"
}
```

##### Example 2: Facebook Post
**Source**: `examples/Instagram_Twitter_Social_Media/Automate multi-platform Social Media Content Creation with AI.json`  
**Workflow**: ✨🤖Automated AI Powered Social Media Content Factory for  X + Facebook + Instagram + LinkedIn

**Credentials**: `{{CREDENTIAL_facebookGraphApi}}`

**Configuration**:
```json
{
  "edge": "photos",
  "node": "[your-unique-id]",
  "options": {
    "queryParameters": {
      "parameter": [
        {
          "name": "message",
          "value": "={{ $('Social Media Content Factory').item.json.output.platform_posts.Facebook.post }}\n\n{{ $('Social Media Content Factory').item.json.output.platform_posts.Facebook.call_to_action }}\n"
        },
        {
          "name": "link",
          "value": "={{ $('Social Media Content Factory').item.json.output.platform_posts.Facebook.call_to_action }}"
        }
      ]
    }
  },
  "sendBinaryData": true,
  "graphApiVersion": "v20.0",
  "httpRequestMethod": "POST",
  "binaryPropertyName": "data"
}
```

##### Example 3: Check Status Of Media Before Uploaded
**Source**: `examples/Instagram_Twitter_Social_Media/Generate Instagram Content from Top Trends with AI Image Generation.json`  
**Workflow**: Generate Instagram Content from Top Trends with AI Image Generation

**Credentials**: `{{CREDENTIAL_facebookGraphApi}}`

**Configuration**:
```json
{
  "node": "={{ $json.id }}",
  "options": {
    "fields": {
      "field": [
        {
          "name": "id"
        },
        {
          "name": "status"
        },
        {
          "name": "status_code"
        }
      ]
    }
  },
  "graphApiVersion": "v20.0"
}
```

##### Example 4: Prepare data on Instagram
**Source**: `examples/Instagram_Twitter_Social_Media/Generate Instagram Content from Top Trends with AI Image Generation.json`  
**Workflow**: Generate Instagram Content from Top Trends with AI Image Generation

**Credentials**: `{{CREDENTIAL_facebookGraphApi}}`

**Configuration**:
```json
{
  "edge": "media",
  "node": "={{ $('Instagram params').item.json.instagram_business_account_id }}",
  "options": {
    "queryParameters": {
      "parameter": [
        {
          "name": "image_url",
          "value": "={{ $json.output[0] }}"
        },
        {
          "name": "caption",
          "value": "={{ $('Analyze Content And Generate Instagram Caption').item.json.message.content }}"
        }
      ]
    }
  },
  "graphApiVersion": "v20.0",
  "httpRequestMethod": "POST"
}
```

##### Example 5: Publish Media on Instagram
**Source**: `examples/Instagram_Twitter_Social_Media/Generate Instagram Content from Top Trends with AI Image Generation.json`  
**Workflow**: Generate Instagram Content from Top Trends with AI Image Generation

**Credentials**: `{{CREDENTIAL_facebookGraphApi}}`

**Configuration**:
```json
{
  "edge": "media_publish",
  "node": "={{ $('Instagram params').item.json.instagram_business_account_id }}",
  "options": {
    "queryParameters": {
      "parameter": [
        {
          "name": "creation_id",
          "value": "={{ $json.id }}"
        }
      ]
    }
  },
  "graphApiVersion": "v20.0",
  "httpRequestMethod": "POST"
}
```


---

### Reddit
**Type**: `n8n-nodes-base.reddit`  
**Description**: n8n node for reddit operations.  
**Auth Required**: `none`  
**Usage Count**: 1 templates

#### Common Operations/Modes
- `search`

#### Usage Examples

##### Example 1: Reddit
**Source**: `examples/Instagram_Twitter_Social_Media/Reddit AI digest.json`  
**Workflow**: Reddit AI digest

**Configuration**:
```json
{
  "keyword": "n8n",
  "location": "allReddit",
  "operation": "search",
  "additionalFields": {
    "sort": "new"
  }
}
```


---

### HackerNews
**Type**: `n8n-nodes-base.hackerNews`  
**Description**: n8n node for hackerNews operations.  
**Auth Required**: `none`  
**Usage Count**: 3 templates

#### Common Operations/Modes
- `all`

#### Usage Examples

##### Example 1: Hacker News
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Hacker News to Video Content.json`  
**Workflow**: Hacker News to Video Template - AlexK1919

**Configuration**:
```json
{
  "resource": "all",
  "additionalFields": {}
}
```

##### Example 2: SearchAskHN
**Source**: `examples/AI_Research_RAG_and_Data_Analysis/Learn Anything from HN - Get Top Resource Recommendations from Hacker News.json`  
**Workflow**: Learn Anything from HN - Get Top Resource Recommendations from Hacker News

**Configuration**:
```json
{
  "limit": 150,
  "resource": "all",
  "additionalFields": {
    "tags": [
      "ask_hn"
    ],
    "keyword": "={{ $json[\"I want to learn\"] }}"
  }
}
```

##### Example 3: Hacker News
**Source**: `examples/OpenAI_and_LLMs/AI chat with any data source (using the n8n workflow tool).json`  
**Workflow**: AI chat with any data source (using the n8n workflow tool)

**Configuration**:
```json
{
  "limit": 50,
  "resource": "all",
  "additionalFields": {}
}
```

