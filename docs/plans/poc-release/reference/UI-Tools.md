# Tools
Dashboard with sections summarizing the current state of the workspace. The page is currently named **Usage**[Claude Design](https://claude.ai/design/p/f6ccea46-66dd-4b8d-b6c3-2ba8f0c2620e?file=tools.html) [Local](/Users/marcos/projects/open-tomato/component-breakdown/demo/raw-design-system/tools.html). 

## Page Properties:
- **Title**: Roadmap.
- **Url pattern**: `/tools/`.
- **Sub pages Url pattern**: 
  - View: `/tools/${tool_id}`
  - New: `/tools/new`
  - Edit: `/tools/${tool_id}/edit`
  - Clone: `/tools/${tool_id}/clone`
  - Export `/tools/${tool_id}/export`
- **Subtitle / Tags**: connected surfaces · API, MCP, skills
- **Context**: What your agents can touch. API clients, MCP servers, and skill libraries.

## Content: 
- Page title ("Roadmap") we have a `+ new tool` button. 
- Below then we have a simple row of agent type filter badges with **all**, **API Client**, **MCP Servers**, and **Skills** to hide show associated tool cards.
- Then below we have a grid of Tool Cards `ToolCard` components.
  
### ToolCard
The card is composed of 4 rows, header, Description, Tool Summary and footer.

- Header: 
  - This row has the known entitie `tool-title` component. 
  - An accented badge with the tool status:
    - Connected (Success accent color, check or green dot decoration)
    - Needs attention (Error accent color, `triangle-alert` icon decoration )
    - Disabled ( Disabled accent color, No decoration or `wrench-off` icon)
  -  At the end of the row a vertical elipsis icon button that shows a contextual. Check **Card Contextual Actions** for details
- Description: 
  - Description paragraph, 1 to 3 lines tops. 
- Tool Summary: Decorated container taking the remaining of the card height. 
  - Top line shows:
    -  small icon of tool type:
       - `file-braces-corner` for API
       - `server` for servers
       - `drafting-compass` for skills
    - the URI of the tool
    - a small text on the rightmost position showing `x tools` (for MCP Servers), or `x skills` (for Skills)
  - Below we list the webhooks which should fire this tool (session ended, session started, tool errer, etc)
- Footer: 
  - A dotted line on top, the content is always aligned to the bottom. 
  - In a single line: 
    - Small bot icon decoration and the number of uses for this tool in this workspace. "never used" if no uses have been tracked.
    - on the rightmost position 



### Card Contextual Actions:

```typescript
interface ContextualAction {
  icon: string // Lucide Icon enum? 
  title: string;
  action: (id: string, data: RowData) => void;
}

const tableActions = {
  actions: [
    {icon: 'pen-line', tite: 'Edit', action: edit},
    {icon: 'refresh-cw', tite: 'Test Connection', action: connectToolTest},
    {icon: 'Duplicate', tite: 'Duplicate', action: cloneTool},
  ],
  destructive: {icon: 'archive', tite: 'Archive', action: archive};
```

## New components
### ToolTypeSelector
Not related to `ToolPicker`. This is a grid card-like selector. Showing the type of tool to be defined in the form. It's a squareish container with an icon, a type name, then a description underneath. Raw design shows the icon, name and description one beneath the other. In our version we should have Icon and name side by side, then description underneath. Each tool type should have a system level color identification accent. 
The options are:
- Icon `file-braces-corner` for "API Client", with "Token-authenticated webhook integration. Calls out on system events." description. 
 - Icon `server` for "MCP server", with "Model Context Protocol server. Exposes its tools to every agent." description
 - Icon `drafting-compass` for "Skills", with "A folder or repo of skill prompts the agent can invoke by name" description

## Sub Page: New Tool
Modal with a partially dynamic form, which is driven by a `ToolTypeSelector` on it. 
The original raw design includes an icon selector, each type will have a default icon associated to them for the POC/MVP.
- Header:
  - Title: New tool
  - Subtitle: wire up something for your agents to call
- Content
  - Static segment:
    - ToolTypeSelector, with title and description: "Tool type" and "Which type of tool are we defining below".
    - Name, line input field
    - Description, text area input field.
  - Dynamic segment:
    - Divider with a text "{tool type} settings"
    - for MCP Servers:
      - "Server URL" input line, and "stdio:// or http(s):// addressable from the dashboard host." helper text. Input field with "server" icon decoration on the left. Could include validation for supported URI formats
      - "Credentials" optional, text area input text, with "JSON blob or env-var name. Stored encrypted." helpter text. Field validates as json.
      - "Auto-start" title and"Connect to the MCP server when this workspace boots up." description, for a `DecoratedToggle` row, with 'recommended' label and on by default. 
    - for Skills:
      - "Source" input line field with "A local folder or a GitHub repo URL." as description
      - A "load skills" button will check the source and show a list of available skills below as `DecoratedToggleList` to turn on/off, all on by default. Loading skills is required before creating the tool (add tool button on the modal is disabled otherwise).
    - for API Clients:
      - "Webhook endpoint" single line input field with "The URL we POST to on the events you pick below." as description. 
      - "Auth scheme" as segment showing a select options driven different combinations of input fields for authentication of API request:
        - none: no extra fields shown.
        - Token: Token type input (bearer as default text) and text input for the actual token. Switches to disabled password on edit, this is stored encrypted. 
        - Basic: user and password fields. 
        - Custom headers: List of Header key, and Value pair input fields, shows only one by default. A button to add another header is shown if no header key/value are empty. 
        - "Call webhook on" title of a segment with "Which system events should fire this tool?" description. Bellow a ChipList allows selection of known system events. 
- Footer
  - Regular modal footer with `ModalFooterStatus` wired to the `ToolPicker`, so the status text indicates which type of tool is being created "Skill", "API Client" or "MCP Server"
  
## Sub Page: Edit Tool
Only Elements of the Dynamic segment can be modified, everything on the Static segment is read only. 

## Sub Page: Clone Tool
Only Name, Description and Elements of the Dynamic segment can be modified, we append  `cloned` to the tool name.

## Behavior: Test Connection
Testing connection is reflected by changing the `ToolCard` badge of status to "connecting" with accent and pulse, then fallbacks to regular badge/chip indicating status. Details if there's an error in connection would show up as a persistent toast notification (no auto dismiss in x seconds).