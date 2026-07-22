# Overview
Dashboard with sections summarizing the current state of the workspace. The page is currently named **Usage**[Claude Design](https://claude.ai/design/p/f6ccea46-66dd-4b8d-b6c3-2ba8f0c2620e?file=usage.html) [Local](/Users/marcos/projects/open-tomato/component-breakdown/demo/raw-design-system/usage.html). 

## Page Properties:
- **Title**: Overview.
- **Url pattern**: `/workspace/${workspace_id}` for multi workspace users. `/` for single worspace users. 
- **Subtitle / Tags**: tokens - sessions - spend
- **Context**: What we're spending tokens on, where the budget sits, and which runs are pulling the most weight.
- **Tool bar**: Time range selector (7 days, 30 days, 90 days, this year), Export (Menu options: PDF, JSON, YAML, CSV, Share modal)

The **URL Pattern** persists as the base path for **Sessions**, **Agents**, **Roadmap**, **Tools** pages. Is not clear if have split **Settings** tied to workspace or if 

## Content: 
- Row with 4 SmallStatCard as shown in design. 
- RowStatCard with monthly budget and current usage (used, forecast)
- Row with 2 charts: 
  - Tokens by model (line chart TBD)
  - Tool calls: Simple UsageChart.
- Row with 2 charts:
  - Spend by Agent: Multi UsageChart.
  - When Agents run: Calendar heatmap.
- Full row chart card: Top 5 sessions by spend
  - Header: Title: Top 5 sessions by spend. Subtitle: "Click for the full transcript". On the right: "-> See all sessions" link to sessions page.
  - Decoration: Label component with subtle or transparent background and simple accent color showing the rank (01, 02, 03, 04, 05).
  - DoubleLine text component with the session name and agent execution as subtitle (eg: agent name, tool name, etc).
  - Known Entity (Model): Icon and name of model used. 
  - Label: Done, Failed, Running, etc. with accent color based on status.
  - Value with unit: Tokens used.
  - Cost: Cost in USD.

## New components:
- SmallStatCard:
  - Small top line header with title/name on the left, and trending on the right (arrow, % and accent color)
  - Stat value: Human readable value, with suffix (small grayed out on the right of the value) for "units" (eg: tokens, tools, runs, errors, etc), or "goal" separated by `/` for "current / goal" (eg: 100 / 200 tokens, 5 / 10 tools, etc) 
  - Bottom line: optional small text with contextual information, a link to the relevant page (eg: "View all sessions", "View all agents", etc), or graphical indicator (eg: progress bar, sparkline/area chart, etc) depending on the context of the card.
- RowStatCard:
  - Single row card with 2 rows of information:
  - Row 1: Title and subtitle on the left. Aligned to the the right "invisible columns" with small stats of Title on top, value below, with optional (automatic for trending) accent color for values (eg: red for errors, green for success, etc).
  - Row 2: Optional small text with contextual information, a link to the relevant page (eg: "View all sessions", "View all agents", etc), or graphical indicator (eg: progress bar, sparkline/area chart, etc) depending on the context of the card. (NOTE!: Current example includes a progress bar with start end values, an indicator for the forecast/goal with a legened, but it's misaligned).
- LineChart: 
  - TBD: We need to see if our current libraries can handle the requirements and styling for this component. 
- UsageChart / ProgressChart: Difference between usage and progress variant is one only shows "count" the other is a ratio of "count / total". The graphic bar will be the same, but progress variant will show a gray background. Total prop will be also required when using the progress variant.
  - Header: Title, optional subtitle. On the left optional filter/sorting options selector. 
  - Content: table or table-like structre (no visible borders or row indicators). 2 modes:
    - Simple: 3 columns: Name, progress / usage, value. 
      - Name: Simple text, potentially support truncation and tooltip for long names.
      - Bar indicator:
        - Progress ratio is a visual indicator of the progress towards a goal (eg: 50% of tokens used, 75% of tools used, etc). Value is the actual value (eg: 500 tokens, 10 tools, etc). Special visual consideration not included in the original design needs to be made for progress exceeding 100% (eg: 150% of tokens used, 120% of tools used, etc).
        - Usage ratio is visual indicator where the "100%" is the highest value on the table list.
      - Value: Human readable value, optionally support a property for truncation and tooltip for long values.
    - Multi: Multi-column table with 3 static columns, plus additional columns with free content: 
      - 1st Static Column (Decoration): Avatar, Icon, Badge, etc. Optional, but if present should be the first column. 
      - 2nd Static Column (Name, progress / usage): Similar to simple but condensed to a sinle line with name and usage on top, and bar below.
      - 3rd Static Column (Value): Human readable value, optionally support a property for truncation and tooltip for long values.
      - Additional columns: Free content, can be any formatted text content, or link. 
- Calendar heatmap:
  - Header: Title, optional subtitle. On the left optional predefined date ranges or calendar icon to switch months.
  - Content: Calendar heatmap with color intensity based on the value of the day. Grid dimensions are predefined based on the date ranges allowed. 
    - This week: First column is the day of the week. 24 columns for each hour of the day. The top row aligns with the first hour (`00`), and shows hour label every 4 hours. 7 rows for each day of the week, with the first row being the start of the week (start of the week will be defined/selected in settings, we start on monday for now). The last cell of the grid (bottom right) will be the last hour of the current week. The first cell of the grid (top left) will be the first hour of the current week.
    - Last 90 / 180 days: First column is the day of the week. 90 or 180 columns depending on the mode. 7 rows for each day of the week, with the first row being the start of the week (start of the week will be defined/selected in settings, we start on monday for now). The last cell of the grid (bottom right) will be the last day of the current range. The first cell of the grid (top left) will be the first day of the current range.
    - Optional tooltip on hover the node indicator to show details. Optional click action to drill down to the day details (eg: `{day}-{month}-{year} | {date}-{hour}: {value} {label}`).
- CellContent: Consider create additional components to be used inside the Tables to standardize certain cell formats. Some examples:
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
- TableRow modifiers: Optional components to be used inside the Tables to standardize certain row formats. Some examples:
  - Checkbox: Optional row selection checkbox. If present, should be the first column. Optional prop to define if the checkbox is disabled or not. Consider if checked events are meant to be handled by a parent provider as part of the table component or it fully depends on implementation to hook it up to a common controller.
  - SortHandle: Optional row sort handle. If present, should be the first column. Optional prop to define if the sort handle is disabled or not. Consider if sort events are meant to be handled by a parent provider as part of the table component or it fully depends on implementation to hook it up to a common controller. Implements Droppable/Draggable pattern for reordering rows.
  - odd/even row styling: Optional prop to define if the table should have odd/even row styling. If present, should be applied to the table row component. Consider if the styling is meant to be handled by a parent provider as part of the table component or it fully depends on implementation to hook it up to a common controller.
