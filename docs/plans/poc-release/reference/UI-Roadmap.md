# Roadmap
List of all tasks in the workspace. The main roadmap page can be found in [Claude Design](https://claude.ai/design/p/f6ccea46-66dd-4b8d-b6c3-2ba8f0c2620e?file=tasks.html) and [Local](/Users/marcos/projects/open-tomato/component-breakdown/demo/raw-design-system/tasks.html). It allows to view a sub page for each main task (aka roadmap). Also allows to create a new task, and to view the task's details in a modal.

## Page Properties:
- **Title**: Roadmap.
- **Url pattern**: `/tasks/`.
- **Sub pages Url pattern**: 
  - View: `/tasks/${task_id}`
  - New: `/tasks/new`
  - Edit: `/tasks/${task_id}/edit`
  - Clone: `/tasks/${task_id}/clone`
  - Export `/tasks/${task_id}/export`
- **Subtitle / Tags**: tasks · seed an agent from any of them
- **Context**: tasks · seed an agent from any of them.

## Content: 
- Page title ("Roadmap") we have a `+ new task` button. 
- Below we have a detached toolbar for the task table, that allows for search tasks by name, then it has 2 selections for status and priority. 
- Check Table Config and Table Actions for table specifics.

### Table Actions:

```typescript
interface ContextualAction {
  icon: string // Lucide Icon enum? 
  title: string;
  action: (id: string, data: RowData) => void;
}

const tableActions = {
  actions: [
    {icon: 'play', tite: 'Run session', action: attachToNewSession},
    {icon: 'copy', tite: 'Copy Task ID', action: copyToClipboard},
    {icon: 'liat-todo', tite: 'Set status: To-do', action: setStatusTodo},
    {icon: 'play', tite: 'Set status: In Progress', action: setStatusInProgress},
    {icon: 'shield-alert', tite: 'Set prio: Blocked', action: setStatusBlocked},
    {icon: 'circle-check-big', tite: 'Set prio: Done', action: setStatusDone},
    {icon: 'flame', tite: 'Set prio: High', action: setPriorityHigh},
    {icon: 'circle-alert', tite: 'Set prio: Medium', action: setPriorityMedium},
    {icon: 'chevron-down', tite: 'Set prio: Low', action: setPriorityLow},
  ],
  destructive: {icon: 'archive', tite: 'Archive', action: archive};
```

### Table Config:
```json
{
  "columns": [
    {
      "title":"Id",
      "type": "text"
    },
    {
      "title":"Task",
      "type": "task-cell"
    },
    {
      "title": "Status",
      "type": "badge"
    }
    {
      "title":"Blocking",
      "type": "badge"
    },
    {
      "title":"Owner",
      "type": "user-inline"
    },
    {
      "title":"Priority",
      "type": "badge"
    },
    {
      "title":"ETA",
      "type":"relative-time"
    }
    {
      "title": null,
      "type": "context-menu"
    },
    
  ]
}
```

## New components:
- Title: Line input
- Description: Textarea input
- Line with 3 selects:
  - Status
  - Priority
  - Owner
- Two fields in a row: 
  - Tags: A multi mode ChipList with `allowNew` enabled
  - ETA: A text input with format validation for date tieme (for now as we don't have a calendar component yet).
- Divider: Attachments
  - Droppable region for "Attachment"
- Divider: "Relations"
- Parent Task: A sinlge mode ChipList to pick a parent task
- Subtasks: A multi mode ChipList to pick other sub tasks.
- Red group area with:
  - Blocked By: A multi mode ChipList to pick other tasks blocking this one.
  - Blocking: A multi mode ChipList to pick other tasks blocked by this one.