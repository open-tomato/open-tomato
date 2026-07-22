# Settings
List of all tasks in the workspace. The main settings page can be found in [Claude Design](https://claude.ai/design/p/f6ccea46-66dd-4b8d-b6c3-2ba8f0c2620e?file=settings.html) and [Local](/Users/marcos/projects/open-tomato/component-breakdown/demo/raw-design-system/settings.html). It allows a user to navigate a vertical tabbed 

## Page Properties:
- **Title**: Settings.
- **Url pattern**: `/settings/`.
- **Sub pages Url pattern**: 
  - Profile: `/settings/profile` (default)
  - Workspaces: `/settings/new`
  - Members & Groups: `/settings/${task_id}/edit`
  - Notifications: `/settings/${task_id}/clone`
  - Integrations (Only Admins) `/settings/${task_id}/export`
- **Subtitle / Tags**: tasks · seed an agent from any of them
- **Context**: tasks · seed an agent from any of them.


## Content: 
Most of the raw design here is valid, but it is still pending review and nothing has been properly migrated to the component review. That being said, we should work on the vertical sub page switch feature. the shells is somewhat simple: 
- Below the page title "Settings", whe have a vertical navigation set of buttons. Buttons don't have any decoration besides the selected one. The layout is:
  - Rounded icon with background. Double line row on the right with Title and Description.  

