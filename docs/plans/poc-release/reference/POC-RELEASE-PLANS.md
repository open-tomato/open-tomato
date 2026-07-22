# Plan next step to complete PoC release

## Overview
We have completed some required peripheral work to enable a streamlined development of remaining Open-Tomato work. Most of the missing stuff was tied in to UI consolidation and service deployment (non-prod environments). Previous sessions took care of leaving the **Grow-Box** [local](/Users/marcos/projects/open-tomato/grow-box)[remote](https://github.com/open-tomato/grow-box) and the **component breakdown** [local](/Users/marcos/projects/open-tomato/component-breakdown)[remote](https://github.com/open-tomato/component-breakdown) ready. Now we need to plan the remaining work that was blocked by these missing pieces.

## High level stages
1. Check-in: Validate current state, what's done, what's missing, where we diverged enough to be off-road. (only survey and summarized, no changes applied). Sources:
   1. local working directory
   2. Past commits/prs comments
   3. linear, Open-tomato team. There we tracked the original projected roadmap. Future work includes stubs and fully defined projects with issues, most if not all work already done should be on done column with full descriptions. 
2. Understand new problem space.
3. From overlaps and divergences between 1 and 2, identify missing features and key dependencies. 
4. Brainstorm (human and agents) alternatives to fill in the gaps or correct directions given the new reality of the project.
5. Plan future work
6. ?
7. Profit!

> [!note] 6 and 7 are only meant as a jest, don't pay attention to them. :D 


## Planning for future work:
Once published `@open-tomato/ui-components` should not know anything about the raw design system or the component breakdown projects. Therefore this session targets a multi repo/project planning, as we might need to re-export designs from the raw design system (claude design), trigger component migration/fixing in the break down project, and then import them to `@open-tomato/ui-components`. To comply with the published library requirements. So each stage and plan should indicate in which repo should be executed and which plan should be executed before which one or if they can be ran in parallel. 

## Considerations:
- Some components in the breakdown are not fully done, or are still missing a few tweak, the MD files linked [here](/Users/marcos/projects/open-tomato/open-tomato/.temp/UI-STRUCTURE.md) could include some insight on what needs to be tweaked or included as part of the component breakdown. 
- `@open-tomato/pre-components` is a midway library, where we have the knowledge on how to read, import, style, test and validate the components present in the raw design system. The ui library targeted for the webapp should clone most of the broken down components into a new library/package inside `@open-tomato/ui-components` currently located [here](/Users/marcos/projects/open-tomato/open-tomato/packages/ui/components). 
- `@open-tomato/ui-components` contains a stub only right, mostly adapted from the original `@open-tomato/pre-components`, additional imports from the original repo/package can be ported into the new one if deemed necessary. 
- Plan for addressing some missing components in comparison with the original and some of the existing ones that resulted into simplified stubs. 
- The descriptions included in the MD files linked [here](/Users/marcos/projects/open-tomato/open-tomato/.temp/UI-STRUCTURE.md) use the [raw design](/Users/marcos/projects/open-tomato/component-breakdown/demo/raw-design-system/index.html) screen definitions as starting point. 
  - Some of the migrated components and pages existing in the breakdown are a very simplified version or stubs. 
  - Take in account that some functionality is redundant or experimental in the raw design, like allowing double display mode (list and cards) and the MD files address which one is preferred. 
  - Is relevant to understand and include some of the more fine-grained components present in the raw design as these will be driving some of the missing features and data points from our backend services. 
- There are 2 important missing sub-pages that are not directly linked in the nav bar on the side when looking at the app shell: Notifications and search results. These are accessible only by interacting with the top bar. Here are some general guidelines to address for these missing designs in a simplified way, reusing existing components while more detailed designs are worked for them:
  - Search result: double row components with decorators (avatar/icon) on the left to indicate type, title on the top, description below, clicking on them redirects to the page.
  - Notifications: Table with type, notification text, source, date, link to action or resource. The type is badge. The notification text is a double line with title of the notification (default provider or source if not provided as part of the notification) and description/text of the notification. 
- Ideally `@open-tomato/ui-components` should not be linked or make a reference to the raw design system or the component-breakdown library as these are internal efforts not meant to be published as part of the open-tomato product. 



## New objectives
We've been breaking down some of the services and features that are not really core functionality of what we envision for Open-Tomato, so the new objectives may differ a bit from the original project that included an extensive set of definitions (ranging from ui, to infrastructure and low level config and CLI support), that are now covered by other projects. We can now focus on the core functionality and goal of our project. 

### Web APP and other UI stuff
The component breakdown has provided us with most individual components, some broad strokes templates (AppShell), the AuthShell and some tooling (skills) on how to understand the design system files and migrate them into reusable component following our coding standards (eg. Variant based styling instead of inline class styling). The Web app centralizes the data and states provided by different backend services. This is a front end definition only, the PoC/MVP target includes the following "apps":

- Homepage: Public facing webpage, product description, link to doc, login and social media profiles.
- Documentation: Aggregated documentation site, built on top of our internal doc, readmes, context, etc. 
- Authentication: Sign up, login, password recovery, Oauth. 
- Webapp: The open-tomato app. 

#### Homepage:
Single page, with description and intro to the site, we don't plan for additional screens at this stage, this will act basically as a product description landing page with links to the relevant sites we might be looking for:
  - Github
  - Patreon
  - Documentation / API Reference
  - Login to webapp demo (Authentication App)

#### Documentation:
Auto generated documentation, currently divided in 3 categories: 
  - Concepts: Intro, install, setup/config, basic usage, integrations.
  - API Reference (only to some front facing not contract base services eg: Notifications, Agents, etc)
  - Examples: Some medium to advance usage examples. 

#### Authentication:
Authentication gateway, individually hosted app with oAuth/OIDC flows support. Most of the required screens are already design and ready to be migrated to their own package. Given that the front end is completed and the backend is still TBD, we can use the existing UI as driver for the backend feature definition, the screens can be found in our local component breakdown project, mainly [in the pages definition](/Users/marcos/projects/open-tomato/component-breakdown/src/pages/auth) and [the auth shell template](/Users/marcos/projects/open-tomato/component-breakdown/src/templates/AuthShell). As of current target and goals, the workspace screen exists in the Auth layer mostly for group/team/invitation validation to be flagged at token level. At later stage this can be moved to the Webapp. 

Some high level breakdown:
- Sign in:
  - With Email (Login)
  - OAuth (OAuthConfirm)
- Sign up:
  - with Email (SignupEmail)
  - OAuth (OAuthConfirm)
  - Done (SignupDone)
- Reset:
  - Send email (ForgotEmail)
  - Email sent (ForgotSent)
  - Enter Code (ResetCode)
  - Done (ResetDone)
- 2FA: 
  - 2FA strategy (TwoFactor/Pick)
  - QR Scan (TwoFactor/Scan)
  - Confirm (TwoFactor/Confirm)
  - Done (TwoFactor/Done)
  - Passkey (Missing flow, needs definition)
- Workspace:
  - Select (WorkspacePick/Invited)
  - Default (WorkspacePick/Self Serve)

#### Webapp: 

The Webapp is built around the AppShell. Its version present in the **Component Breakdown** project has a very broad stroke of what the app would really cover, but it was enough to go through most (if not all) of the reusable components that will be used in this stage. More detailed screens can be found in the original raw design system definition. [Here](/Users/marcos/projects/open-tomato/open-tomato/.temp/UI-STRUCTURE.md)'s a break down of each screen/page with their components/features, I left the settings section intentionally as a stub as it's level of complexity and number of screens could match the rest of the app, and it's gonna be a different session with a similar level of effort, but we can leverage some of the components made on this session to streamline the settings work at a later stage. 



