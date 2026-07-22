# New components:

Here are some high level complex components that we should build from the existing atoms and molecules. These components serve as templates for certain automatically generated content (eg. Cards, cell content for tables, etc) and will require to be built with both config and data contract in mind.

## Cards and Charts
Consider defining a max/min height and width (custom units per card template?) for different card types aligned with the grid columns and rows dimensions. This will allow different card types to align and distribute seamlesly and avoid breaking format on responsive pages. Also consider that if the sizing gets too custom, some containers might need to be told min/max units to support proper re arrangement of cards if the grid is filled dynamically. 

### SmallStatCard:
- Small top line header with title/name on the left. On the right it can support a decoration (icon, avatar, label, etc) or trending (up/down arrow, `{+|-}{value}%` with accent color)
- Stat value: Human readable value, with suffix (small grayed out on the right of the value) for "units" (eg: tokens, tools, runs, errors, etc), or "goal" separated by `/` for "current / goal" (eg: 100 / 200 tokens, 5 / 10 tools, etc) 
- Bottom line: optional small text with contextual information, a link to the relevant page (eg: "View all sessions", "View all agents", etc), or graphical indicator (eg: progress bar, sparkline/area chart, etc) depending on the context of the card.

### RowStatCard:
- Single row card with 2 rows of information:
- Row 1: Title and subtitle on the left. Aligned to the the right "invisible columns" with small stats of Title on top, value below, with optional (automatic for trending) accent color for values (eg: red for errors, green for success, etc).
- Row 2: Optional small text with contextual information, a link to the relevant page (eg: "View all sessions", "View all agents", etc), or graphical indicator (eg: progress bar, sparkline/area chart, etc) depending on the context of the card. (NOTE!: Current example includes a progress bar with start end values, an indicator for the forecast/goal with a legened, but it's misaligned).

### LineChart: 
- TBD: We need to see if our current libraries can handle the requirements and styling for this component. 

### UsageChart / ProgressChart: 
Difference between usage and progress variant is one only shows "count" the other is a ratio of "count / total". The graphic bar will be the same, but progress variant will show a gray background. Total prop will be also required when using the progress variant.
- Header: Title, optional subtitle. On the left optional filter/sorting options selector. 
- Content: table or table-like structre (no visible borders or row indicators). 2 modes:
  - Simple: 3 columns: Name, progress / usage, value. 
    - Name: Simple text, potentially support truncation and tooltip for long names.
    - Bar indicator:
      - Progress ratio is a visual indicator of the progress towards a goal (eg: 50% of tokens used, 75% of tools used, etc). Value is the actual value (eg: 500 tokens, 10 tools, etc). Special visual consideration not included in the original design needs to be made for progress exceeding 100% (eg: 150% of tokens used, 120% of tools used, etc).
      - Usage ratio is visual indicator where the "100%" is the highest value on the table list.
    - Value: Human readable value, optionally support a property for truncation and tooltip for long values.
    - Single line variant: for `UsageChart` instead of individual rows, there can be a single bar segmented in colors, and 2 columns belog with the legend of each color and the value associated with it. As `[color] {text} {value}`.

  - Multi: Multi-column table with 3 static columns, plus additional columns with free content: 
    - 1st Static Column (Decoration): Avatar, Icon, Badge, etc. Optional, but if present should be the first column. 
    - 2nd Static Column (Name, progress / usage): Similar to simple but condensed to a sinle line with name and usage on top, and bar below.
    - 3rd Static Column (Value): Human readable value, optionally support a property for truncation and tooltip for long values.
    - Additional columns: Free content, can be any formatted text content, or link. 
- Footer: simple text, supports a prop to show a divider or not when present.

### Calendar heatmap:
- Header: Title, optional subtitle. On the left optional predefined date ranges or calendar icon to switch months.
- Content: Calendar heatmap with color intensity based on the value of the day. Grid dimensions are predefined based on the date ranges allowed. 
  - This week: First column is the day of the week. 24 columns for each hour of the day. The top row aligns with the first hour (`00`), and shows hour label every 4 hours. 7 rows for each day of the week, with the first row being the start of the week (start of the week will be defined/selected in settings, we start on monday for now). The last cell of the grid (bottom right) will be the last hour of the current week. The first cell of the grid (top left) will be the first hour of the current week.
  - Last 90 / 180 days: First column is the day of the week. 90 or 180 columns depending on the mode. 7 rows for each day of the week, with the first row being the start of the week (start of the week will be defined/selected in settings, we start on monday for now). The last cell of the grid (bottom right) will be the last day of the current range. The first cell of the grid (top left) will be the first day of the current range.
  - Optional tooltip on hover the node indicator to show details. Optional click action to drill down to the day details (eg: `{day}-{month}-{year} | {date}-{hour}: {value} {label}`).

## Atoms / Molecules
### ModalFooterStatus
This is an addition to the existing modal structure, it should allow for a "status" string present on the footer align to the left. This is driven by a state change on the content of the modal, so this should be supported by the main modal provider/component.

### FilesChanged
Card showing the list in a table like manner of files changed.
The header includes the number of files affected, the total additions, total deletions. 
Each line shows:
- File type icon.
- file path
- `+` changes in green. Eg: `+126`
- `-` changes in red. Eg: `-0`

### Formatted / Human readable values
Our design system specifies certain display format for different values: eg: money is shown in bold with currency symbol on the left. Tokens and Runs are shown with a human readable value in bold or accentuated and the unit smaller and greyed out on the left. To simplify and allow some level of inference on automaticaly rendered / generated content we shuold consider creating one or more components. Consider the following:
- Don't depend on 3rd party libraries if possible, start using something simple and universal like `Intl.NumberFormat` 
- A single formatter utility can be defined to handle i18n and l10n.
- One or more entry level component and/or specific per usage. eg: 
  - `HumanReadableValue` component for known value. Accepts a value plus a unit, and an optional size prop. 
  - `FormattedDate` Accepts a date value and a locale (Priority goes: use Settings locale first, if not set browser locale, if not set use system locale).
  - `FormattedCurrency` for money we accept a value, currency (eg: usd, eur, ars) and eithr precision int to show decimals (defaults to `precision={2}`), or `short={true|false}` to show in human readable format. 
  - `FormattedPercentage` Ensures % symbol on the right when a value is passed. It should require a boolean for "ratio" (`0.1="10%"`) or "raw" (`10="10%`) values. 
  - `FormattedDuration` Accepts a date range, or a total of seconds and returns a human readable duration string like `1h 3m 10s`
  - `FormattedRelativeTime` Accepts a date and returns a relative time, if withing the same day it returns only `hh:mm` otherwise something like `6 hours ago` => `yesterday` `x days ago` => `last week` => `x weeks ago` => `last month` => `x months ago` => `last year` => `x years ago`. 
  - `FormattedValue` a more general compnent that decides which of the avobe use depending on type. accepts a raw value, a type and optional params.

### Icon
Wrapper to support name based Lucide Icons integration with some existing components instead of custom SVG. Suggested usage: `<Icon name="terminal" size={} accent="" bg-color="">` or similar approach, as long as an icon can be define via a string instead of direct import. 

### Status Indicator: 
Small circle or rounded square indicator for inline status display. Some usage is already present in some components (eg: `Badge` with `dot={true}`) but individual component that support accent and `pulse={true}` doesn't exist. 

### Trend Indicator: 
trend prop accepts a ratio value (eg: `0.1` = `10%`). Positive numbers are an up trend, negatives are down, 0 is no trend. 
  - `trend={0.1} showValue={true}`: Accent green, arrow up.
  - `trend={-0.3}`: Accent red, arrow down.
  - `trend={0}`: `-` Accent gray, horizontal line `-`. It's unclear to me if standard conventions dictate to show a null / 0 trend or hide this component if null trend. 
  - `trend={...} value={true}`: If value is present, we show it with a percentage sign, prepending a `+` or `-` sign according to trend (eg: `+15%` or `-20%`

## Known Entities
Some entities (agents, models, sessions, etc) will be references as values in tables, cards, menues, so some basic template for displaying those should be easily available with known contracts. Eg: Besides custom implementation a self defining table grid can infer the component to use if the data type for a column is of `{entity}-{variant}` and pull the right component and pass the right data to it. Some known entities variants can be:
- `agent-title`: Avatar on the left, on the right Name (top, bold), subtitle (grayed out)
- `agent-cell`: Similar to agent-title but smaller, model as subtitle. 
- `session-inline`: Inline status indicator and session name
- `session-cell`: Double line cell with `session-inilne` on top, and subtext on bottom showing `{agent instance id} - {branch-inline}`
- `model-cell`: Small decoration (dot, tiny icon) with accent color, model name.
- `model-footer`: Small icon model name (inherit footer color, no accent color)
- `branch-inline`: Inline `git-branch` lucide icon and branch name. 
- `user-inline`: Small avatar and user id/handle. 
- `task-cell`: Double line with task title/name on top, below inline text tags, 
- `tool-title`: Icon/Avatar on the left, on the right double line with Name on top, in bold. Below we have a badge with the tool type, and the tool slug id.

## Common reusables organisms and FormKit additions
### ModelOption
This component exist in the raw design system, but it has not been fully migrated to the component breakdown. Proper variant and restyling is required to pull it into our stack. It's currently found in `/Users/marcos/projects/open-tomato/component-breakdown/demo/raw-design-system/dashboard/AgentEditor.jsx` It should behave as a form component like a radio or checkbox. A `VerboseOption` / `VerboseOptionList` can be created as a reusable component for this case, and not necessarily tie up the `ModelOption` example component to the model option use case. 
  - it can behave as a radio or checkbox, it has an color change when selected.
  - it shows model name, and badges with details about the model (fast, web, chat, image, code, slow, thinking, etc)
  - Short description of what it does. 

### ToolPicker
This component exist in the raw design system, but it has not been fully migrated to the component breakdown. Proper variant and restyling is required to pull it into our stack. It's currently found in `/Users/marcos/projects/open-tomato/component-breakdown/demo/raw-design-system/dashboard/AgentEditor.jsx`. A `DecoratedToggle` / `DecoratedToggleList` can be created as a reusable component for this case, and not necessarily tie up the `ToolPicker` example component to the model option use case. 
- Name/Title of the group with an indicator of how many items are on (eg: 3/5)
- Rows with the grouped toggles. Each row is a block with colored and rounded borders with:
  - Decoration (avatar, icon, etc), vertically aligned.
  - double line row of Title/Name on top, short description grayed out below.
  - Toggle at the right, vertically aligned. 
  - It changes tone when selected.

### ChipList
- Input that shows a list of suggestions from the typed text. Can be navigated with up/down and be selected by pressing enter or clicking on one. First item is always selected after typing, and is the selection if enter is pressed without navigating up/down. 
- When an option is selected, a chip appears inside the container
- If the ChipList is in multi mode, the input is still allowed, chips are added to the top of the container and input remains below. When a chip is already selected, it won't show up again on the results. If the chip is removed it will show up again in the search results.
- If the ChipList is in single mode, the chip takes over and it needs to be removed (by clicking in the X on it) to enable the input search again.
- If ChipList has `allowNew={true}` it will show the text input as the first option if it doesn't match any available option, and it will create a chip out of it if selected. (eg: usable for adding existing tags or defining new ones on the fly)

### AvatarSelector
- Big avatar component
- Small, matching avatar width, input with 1 or 2 maxlength for characters to be shown in the avatar.
- Small grid 3 columns 2 to 4 rows of circles to pick the background color.

## Table enhancements

### CellContent: 
Consider create additional components to be used inside the Tables to standardize certain cell formats. Some examples:
- Value: `{value}`. Pre formatted value (currency, date, time).
- Value with unit: Right aligned `{value} {unit}`. Value is accentuated, unit is grayed out. Human readable value.
- Decoration: Avatar, Icon, Badge, etc. Optional, but if present should be the first column.
- DoubleLine text: Name and subtitle. Name is short and accentuated, subtitle is longer, potentially turcanted.
- Status: Status indicator with optional text. Status can be one of: ok, warn, err, info, disabled, format can be passed to the indicator component (rounded, square, icon, etc).
- Label: Text with accent color, label format, optionally support for multiple lables via an array.
- Bar indicator: Similar to the bar indicator in the UsageChart, the indicator itself could have a prop variant to define the width/stroke, allow a "mini" version, and a regular size one.
- Sparkline: Small sparkline chart.
- Trend indicator: Arrow up/down with Optional percentage, and accent color based on the trend (eg: red for down, green for up, etc).
- Known Entities: Pre formatted known entities (eg: agent, session, tool, etc) with accent color and icon. Optional clickable action to drill down to the entity details (eg: agent, session, tool, etc).
- Consider if each content component is meant to decide if they're gonna support tooltips or as if it's a general feature defined by the parent table cell component.
- `tokens-consumption`: Bold text with total used tokens (full number) over greyed out text with tokens quota (human readable value) eg:`8240 / 50k`
- `tokens-progress` double line cell with `tokens-consumption` on top and progress bar with visual representation of the usage below. Low numbers is green, close to 50% is yellow, close to 100% is red. 
- `spend-over-time`: Double line cell with `FormattedCurrency` on top and `FormattedDuration` - `FormattedRelativeTime` in smaller greyed out style bellow. 

### TableRow modifiers: Optional components to be used inside the Tables to standardize certain row formats. Some examples:
- Checkbox: Optional row selection checkbox. If present, should be the first column. Optional prop to define if the checkbox is disabled or not. Consider if checked events are meant to be handled by a parent provider as part of the table component or it fully depends on implementation to hook it up to a common controller.
- SortHandle: Optional row sort handle. If present, should be the first column. Optional prop to define if the sort handle is disabled or not. Consider if sort events are meant to be handled by a parent provider as part of the table component or it fully depends on implementation to hook it up to a common controller. Implements Droppable/Draggable pattern for reordering rows.
- odd/even row styling: Optional prop to define if the table should have odd/even row styling. If present, should be applied to the table row component. Consider if the styling is meant to be handled by a parent provider as part of the table component or it fully depends on implementation to hook it up to a common controller.
- Context action: `ellipsis-vertical` lucide icon button that shows a context menu with actions for that row. It accepts an objet listing actions and a destructive option to show at the bottom of the menue, something like: `{actions: [ { Icon, title, onClick}, {}], destructive: {Icon, title, onClick}}`. Destructive action shows a semi generic confirmation popover with "this action will {title} the {entity type} with name {entity name}, do you want to proceed?"