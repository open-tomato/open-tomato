# Agents

List of all agents in the workspace. The main agents page can be found in [Claude Design](https://claude.ai/design/p/f6ccea46-66dd-4b8d-b6c3-2ba8f0c2620e?file=agents.html) and [Local](/Users/marcos/projects/open-tomato/component-breakdown/demo/raw-design-system/agents.html). It allows to view a sub page for each agent, with details about the agent's activity, including the model and tools used, and the tokens spent. Also allows to create a new agent, and to view the agent's details in a modal.

## Page Properties:
- **Title**: Agents.
- **Url pattern**: `/agents/`.
- **Sub pages Url pattern**: 
  - View: `/agents/${agent_id}`
  - New: `/agents/new`
  - Edit: `/agents/${agent_id}/edit`
  - Clone: `/agents/${agent_id}/clone`
  - Export `/agents/${agent_id}/export`
- **Subtitle / Tags**: reusable personas · model + tool surface
- **Context**: Personas your team can spawn sessions from.

## Content: 
- Page title ("Agents") we have a filter field to quick filter by agent, model or tool name. Then `+ new agent` button. 
- Below then we have a simple row of filter badges with **all**, **enabled**, **in use**, and **disabled** to hide show associated agent cards.
- Then below we have a grid of Agent Cards `AgentCard` components. The raw design shows a switch between grid and list, but we're not implementing list, only grid. 

### AgentCard
The card is composed of 3 rows, header, content and footer.
- Header: This row has the known entitie `agents-title` component. A badge with the number of running instances (if running) or off (if disabled). At the end of the row a vertical elipsis icon button that shows a contextual menu with the options:
  - (Play icon) Run session (triggers a new session modal with a pre-selected agent)
  - (Pen Line) Edit Agent
  - (Copy plus icon) Duplicate (clone)
  - destructive action:  (Archive icon) Archive
- Content:
  - Description of what the agent does.
  - up to 2 rows of badges with the tools enabled for this agent. Fallbackas to `+x more` if not all of the available tools fit in the rows. If there's no easy style rule to do the trick, limit the tools to 5 and fallback to `+x more` for the rest. 
- Footer: 
  - A dotted line on top, the content is always aligned to the bottom. 
  - In a single line: 
    - `model-footer` 
    - Clock icon with `FormattedRelativeTime` of the last run/use of the agent.
    - History icon with number of total runs. 
    - At the rightmost margin a toggle to turn on/off the model, only if not running.
      - Disabled cards have a light change on coloring for avatar and background and text.

## Sub Page: New Agent
Modal to define a new agent. There's a design stub in the comopnent breakdown but it's not fully accurate. 
- Header: 
  - Title and subtitle: "New Agent" and "create a reusable persona"
- Content:
  - Name an description section, 2 columns:
    - `AvatarSelector` on the first column.
    - "Name" input line and "What does this agent do?" text block.
  - Seed context:
    - `Droppable` file component, required, to define context
  - Model section:
    - Model: `ModelOption` Single pick (radio) list with details on each available model. 
    - Token budget per run: Slider (raw design shows buttons) to select amount between pre defined min/maximum based on model cost. Maximum of 10~20usd.
    - Tools: Grouped `ToolPicker` with x/y indicator on group title. 

## Sub Page: Edit Agent
Same modal as New Agent, but with content already loaded up and options selected.

## Sub Page: Clone Agent
Same modal as Edit Agent, but with `cloned` appended to the name.


