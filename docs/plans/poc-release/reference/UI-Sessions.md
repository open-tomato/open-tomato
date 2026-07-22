# Sessions

List of all sessions in the workspace. The main sessions page can be found in [Claude Design](https://claude.ai/design/p/f6ccea46-66dd-4b8d-b6c3-2ba8f0c2620e?file=sessions.html) and [Local](/Users/marcos/projects/open-tomato/component-breakdown/demo/raw-design-system/sessions.html). It allows to view a sub page for each session, with details about the session's activity, including the tasks and tools used, and the tokens spent. Also allows to create a new session, and to view the session's details in a modal.


## Page Properties:
- **Title**: Sessions.
- **Url pattern**: `/sessions/`.
- **Sub pages Url pattern**: 
  - View: `/sessions/${session_id}`
  - New: `/sessions/new`
  - Clone/Fork: `/sessions/${session_id}/fork`
  - Export `/sessions/${session_id}/export`
- **Subtitle / Tags**: -
- **Context**: What's cooking in the workspace, which sessions are active, and which runs are pulling the most weight, were did we fail?
- **Main Action**: `+ New Session` button, primary plus icon decoration. Aligned with the main title to the right of the page. 

## Content: 
- Row with 4 `SmallStatCard`: 
  - Currently in use:
    - Title: Live now
    - Decoration: Status Indicator accent green, `pulse={true}`.
    - Value: current active sessions
  - Recent usage: 
    - Title: Today
    - Decoration: `terminal` Lucide Icon 
    - value: executed sessions (not-active)
    - unit: runs
  - Recent consumption: 
    - Title: Tokens today
    - Decoration: `cpu` Lucide Icon 
    - value: Human readable number
  - Recent costs: 
    - Title: Cost today
    - Decoration: `dollar` Lucide Icon 
    - value: Currency formatted USD value
- Detached Tool bar: Ignore list/grid toggle from raw design. This page should be shown as list only.
  - filter: by name, id, agent, branch...
  - Quick filter pills: By status
    - Status indicator with pill color
    - Status text: running, waiting, done, failed
    - Session count.
  - by user: Dropdown aligned to the right.
- Table: 
  - Columns: see [table config](#table-config)
  - ContextualActions: see suggested options in [table actions](#table-actions)
  
### Table Actions:

```typescript
interface ContextualAction {
  icon: string' // Lucide Icon enum? 
  title: string;
  action: (id: string, data: RowData) => void;
}

const tableActions = {
  actions: [
    {icon: 'eye', tite: 'Open', action: navigateTo(`/sessions/${rowData.id}`)},
    {icon: 'git-branch', tite: 'Fork session', action: navigateTo(`/sessions/${rowData.id}/fork`)},
    {icon: 'copy', tite: 'Copy session ID', action: copyToClipboard},
    {icon: 'download', tite: 'Export transcript', action: export},
  ],
  destructive: {icon: 'archive', tite: 'Archive', action: archive};
```

### Table Config:
```json
{
  "columns": [
    {
      "title":"Session",
      "type": "session-cell"
    },
    {
      "title":"Agent/Model",
      "type": "agent-cell"
    },
    {
      "title": "Status",
      "type": "user-inline"
    }
    {
      "title":"Tokens",
      "type": "tokens-progress"
    },
    {
      "title":"Spend/Time",
      "type": "spend-over-time"
    },
    {
      "title":"By",
      "type": "user-inline"
    },
    {
      "title": null,
      "type": "context-menu"
    },
    
  ]
}
```
## Sub Page: New Session
Opens a modal to define the properties of the new session which include:
- Title: Short unique name (can be auto generated via random word combination)
- Description: optional longer description (could be auto filled in once roadmap task is picked up)
- Select Roadmap task: Suggest search and/or Drop down to select from roadmap tasks in "ready for development" status. Single Item selection.
- Estimated effort: Details provided by the selected task include estimated token usage and agents. This value can drive a visual indication of the token quota or pre-selection and/or alert tied in with the allowed subagents properties. 
- Use existing branch / Create new banch (task type as branch prefix session title as branch name, task title-slug as suffix)
- Runner Agent: Select an agent to run (coordinate) the session.
- Allowed subagents: List of agents allowed to be picked up by the runner to execute sub tasks.
- Token quota: Slider to select the session limit of tokens allowed to be used, and "no limit" toggle. PoC/MVP has a hardcoded props for this component:
  - ~10 steps in the slider, each step updates the text with estimated tokens and usd in the current quota.
  - Number of tokens is estimated from a maximum allowed cost in USD (10usd) using the lates Opus 4.x as reference for cost per token. 
  - No limit can be toggled on and disable the slider.
  -  The final version will pick the max value from user/workspace settings.
- Schedule start: Toggle enables a text input with format validation for date tieme (for now as we don't have a calendar component yet). 
- Use Automatic PR review: Toggle, off by default. 
- Notify when done: Toggle, on by default. 
- Warning zone (expandable options hidden/collapsed by default, all turned off):
  - Toggle: Allow auto resume if token limit is reached (hourle/weekly limit, not current session quota).
  - Toggle: Allow exceed session quota.
  - Toggle: Alert me if the quota is reached. 
- Start button

## Sub Page: Fork Session
It will allow us to base a new session on a finished/failed one. For now it works identical to New Session, but fills in all properties except:
  - Title: prepends a `-forked` or random short hash to avoid failing validation due to duplicated name.
  - Roadmap Task is empty: only one session per task is permitted, we can't work on the same task twice.
  - Branch name is cleared out.

## Sub Page: Export transcript
For now it produces a JSONL output with the events of the session, (sanitized, low verbosity, mostly metadata and summary). If we can, we trigger a download with a file name matching the session slug, otherwise it displays raw JSONL. 

## Sub Page: View Session
Shows the status and timeline. The raw design has 2 layouts, Timeline and Metadata. We're using "timeline-first" layout which is:
- Top row: 
  - Title on the left, Fork and contextual options on the right (we ignore the replay, we don't re-trigger)
  - Description below. 
  - Roadmap: Link to it.
- If finished we show result card with time, tool calls, and files edited and summary of the action (probably same as used for the pull request), collapsed by default as it could be a big chunk of text. 
- Main column: 
  - Timeline: `SessionTimeline` component showing the events of the session.
  - Files Touched: `FilesChanged` component showing which files were affected.
- Small Right column:
  - Runner metadata:
    - `agent-title` component on top
    - `label-and-text` list with agent metadata and session status including:
      - model used
      - started
      - finished
      - elapsed
      - cost
      - files
      - commits
  - Token Usage: The raw design includes an odd card with some in/out stuff, let's drop that and use a session based instance of the "Recent consumption" `SmallStatCard` we have on the main page. 
  - Tool calls: Single line variant of `UsageChart` 