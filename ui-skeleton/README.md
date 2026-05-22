# UI Skeleton

## Description
This package provides a template structure for organizing UI components, while implementing a design system and ui styling. The goal is to provide an already styled set of components according to the provided design system, only exposing those specifics to the apps use cases and reducing the need to granular styling. 

The components templates are meant to be consumed on demand by an agent, allowing for smaller/scoped code generations, targeted updates and atomic tweaks. With a focus on incremental implementation an agent can produce a styled, ready to implement library with limited variability. This creates a smaller context surface for an agent to learn/interact once the component is defined.


> [!WARNING]: This package contains an UI skeleton organizing components in a way that is meant to be used as a starting point for building a UI component library implementing a design system. It could be used as a standalone package, but functionality is not fully warrantied for those components not fully implemented yet. 

## Stack
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Radix UI](https://www.radix-ui.com/)


## Atomic Design System
- A **Particle** is not a component, but a design element that's used to affect a component. I.e: A variant, a class, a mixing or utility function. 
- An **Atom** is a component that cannot be broken down any further without losing its meaning. It is the most basic building block of a design system. 
- A **Molecule** is a group of atoms. The boundary with particles is a bit blurry, but a rule of thumbs, a molecule doesn't implement other molecules, only atoms and particles. An hypothetical molecule is built with a wrapper component, an optional visual indicators like left/right inserted icons, a title/label of some sort, a text/description and maybe a trigger. All of those are atoms, and the wrapper component is the main molecule binding element.
- An **Organism** is a group of molecules and loose atoms that form a distinct section of an interface. It can be considered as a standalone component that can be reused across different pages or contexts. They could be dependent on hooks, context providers, or even have their own internal state management beyond standard shown/hidden/hover/focus flags. They are often the most complex and feature-rich components in a design system.
- A **Provider** is a component that provides context to its children. It is used to manage state and share data across the component tree. They are not meant to be used directly in the UI, but rather as a wrapper around other components that need access to the provided context.
- A **Template** is a group of organisms that form a page. It is a high-level component that defines the overall structure and layout of a page, but does not include any specific content. It is meant to be used as a starting point for creating new pages, and can be customized with different organisms and content to create unique pages.
- A **Page** is a specific instance of a template that includes specific content and is meant to be rendered in the application. It is the final product that users interact with, and can be considered as the end result of the design system's components and templates.

### Special considerations
- All styling and customization at the foremost level should be handled via (known) variants, and the use of custom styling like via tailwinds className or inline style props should be avoided as much as possible. This is to ensure that the design system is consistent and that the components are styled according to the provided design system.
- Somewhat between Particles and Atoms: These are often common atom components that are dependant of particles to be used. For example titles, or typography components that are dependant of a variant particle to implement styling. In these cases, the component should be an atom and the corresponding variants should be passed as an enum prop. Optional props to handle the html element to be use (span, p, h1, h2, etc) can be added. The best example of this is the Typography component, which is is not a component on itself but a set of examples on how to style and affect text via variants, and css classes. 
- Somewhat between Atoms and Molecules: Special cases exist where an atom could include a wrapper component to handle groupings or context between sibling components. This component should fall into atom or molecule depending on whether the grouping component is not / cannot be provided/exported as an independent molecule and if the atom that's grouped cannot be used independently of the wrapper.
- Somewhat between Molecules and Organisms: Special cases exist where a molecule could include other molecules. This is often the case when a molecule is meant to be used as a standalone component, but also as a building block for more complex components. In this case, the molecule should be considered as an organism if it has its own internal state management or if it is meant to be used as a standalone component, and as a molecule if it is only meant to be used as a building block for other components.
- Components at organism level and below should only be styled via the use of variants. This is to ensure that the design system is consistent and that the components are styled according to the provided design system. Templates and pages should follow a similar guideline, but they're allow special cases where they can extend our atoms and define their own variants for granular styling. They shouldn't be styled via className and style props directly.

### 


## Suggested component organization for shadcn based components. 
### Particles
Variants
Classes
Mixins
Animations
Shadows
Utility functions


### Atoms
Aspect Ratio
Avatar
Card
Badge
Button
Checkbox
Input
Kbd
Label
Progress
Scroll Area
Separator
Skeleton
Slider
Spinner
Textarea
Toggle
Typography

### Molecules
Alert
Button Group
Collapsible
Combobox
Context Menu
Hover Card
Input OTP
Item
Native Select
Popover
Radio Group
Select
Switch
Table
Toggle Group
Tooltip

### Organisms
Alert Dialog
Accordion
Data Table
Date Picker
Breadcrumb
Calendar
Command
Dialog
Drawer
Dropdown Menu
Empty
Field
Input Group
Menubar
Pagination
Resizable
Sonner ( as toast)

### Templates
Navigation Menu
Sheet
Sidebar
Tabs

### Providers
Direction

## Internal shadcn Registry

The `registry.json` at the package root is an **internal** shadcn registry manifest. It is committed to source control so the shadcn CLI (`bunx shadcn@latest`) and downstream tooling within this monorepo can resolve item paths, file types, and dependency metadata for every atom in `src/atoms/`.

It is **not published** to npm, to a public registry endpoint, or to `ui.shadcn.com`. The `"homepage": "internal"` field signals this intent. Consumers outside this monorepo should not rely on the registry; it has no stable URL and no compatibility guarantees across iterations.

If external consumption is ever needed, the registry would be published to a separate private location as a follow-up; this is out of scope for the current iteration.