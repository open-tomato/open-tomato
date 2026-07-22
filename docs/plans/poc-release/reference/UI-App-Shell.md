# App Shell
Current appshell in the **Component Breakdown** library is only a bit more than a working draft. Specially the TopBar which it has its own Design System [page](/Users/marcos/projects/open-tomato/component-breakdown/demo/raw-design-system/topbar.html) to highlight its functionality and complexities. 

The general approach still remains:
```jsx
 <AppShell>
   <AppShellSidebar collapsed={collapsed}>{/* …brand, nav, NavItems… */}</AppShellSidebar>
   <AppShellMain>
     <AppShellTopbar>{ /* …title, search, Menu-driven buttons… */ }</AppShellTopbar>
     <AppShellContent>{page}</AppShellContent>
   </AppShellMain>
 </AppShell>
 ```

## Top Bar
- The collapse button should be part of the main wrapper component `AppShellTopbar`.
- Workspace switcher: New component that should be included and always on the top left. With many workspaces we list the 5 most recent and link to settings → workspaces for the full list, instead of in-place search. Check marks indicate the active workspace. For users with 1 workspace (defalt) this component is hidden. This component will potentially be moved to the sidebar, so it shouldn't have a hard dependency on topbar scope and vicecersa. Fixed/Max width. 
- Search / Suggest: New Component. Input field with lens icon on the left, and `⌘K` label on the right. Globally triggered (scope switch) via `⌘K`. Shows suggestions as the user types. Suggestion list pulls from 5 kinds: agent, session, task, tool, doc — each carries its own accent. Keyboard-driven. Up/Down arrows navigate the option list. Clicking on an option or hitting enter goes to the section/item of the result, pressing enter without a selection falls through to the full search page (full content page version of the suggestion list).
- Notifications Indicator: New component. Ghost variant of icon button, that triggers a popover menu. Red dot on the bell when ≥1 unread. Popover groups by level (ok / warn / err / info), and a 'mark all read' action sits in the header.
- Theme switcher: New Component. Ghost variant of icon button, switches to dark/light theme. If user has "use system" on their settings/user preferences the button is hidden.
- Profile icon: New Component. Touchable Avatar that opens a menu with header including user details (avatar, user name, email, label with role) current options include:
  - My Profile.
  - Account Settings.
  - Switch workspace.
  - Logout: triggers the inline confirm pattern — same Confirm popover used everywhere destructive.

- Confirmation popover: Not visible but anchored to some topbar options. Two flavours: standalone (anchor to any trigger) and inline (renders in-place inside a menu, e.g. the logout flow). Always names the action, never just 'are you sure?'.

## Side Bar
3 main segments with visible divider:
- Top: Matches the height of the top bar, shows title when expanded, only brand logo when collapsed
- Navigation: 
  - (Optional): Workspace/team selector: Same as topbar but initially not implemented in the sidebar. 
  - Navigation options, dynamically generated from json/api/yaml/???. Might require integration with feature flag when implemented. The current nav options are:
    - Overview (Lucide icon: layout-dashboard)
    - Sessions (Lucide icon: terminal)
    - Agents (Lucide icon: bot)
    - Roadmap (Lucide icon: list)
    - Tools (Lucide icon: cpu)
  - Week summary widget: Vertical aligned to the bottom of nav area. Simple stub for now, shows "this week" a status pill with healthy/unhealty/... tokens over limit with progress bar underneath. 
- Bottom: Quick access area, static for now, potentially configurable or showing some kind of "recent" shortcuts. 
  - Docs: opens a new tab with the documentation site.
  - Settings: opens the settings page.


## Main Content:
Main content container, other than minimal layout handling at shell level, fully driven by the children's content. Optionally. it can include a footer component included in `AppShellContent` container with copyright information and general links (documentation, support, feedback, social media).