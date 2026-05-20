# UI Skeleton

## Description
This package contains an UI skeleton organizing components in a way that is meant to be used as a starting point for building an app UI library while implementing a design system. It is not meant to be used as a standalone package, but rather as a template. for how to organize and structure components in a design system. The components are organized according to the Atomic Design System, which is a methodology for creating design systems that emphasizes the importance of breaking down components into smaller, reusable pieces.

## Atomic Design System
- A **Particle** is not a component, but a design element that's used to affect a component. I.e: A variant, a class, a mixing or utility function. 
- An **Atom** is a component that cannot be broken down any further without losing its meaning. It is the most basic building block of a design system. 
- A **Molecule** is a group of atoms. The boundary with particles is a bit blurry, but a rule of thumbs, a molecule doesn't implement other molecules, only atoms and particles. An hypothetical molecule is built with a wrapper component, an optional visual indicators like left/right inserted icons, a title/label of some sort, a text/description and maybe a trigger. All of those are atoms, and the wrapper component is the main molecule binding element.
- An **Organism** is a group of molecules and loose atoms that form a distinct section of an interface. It can be considered as a standalone component that can be reused across different pages or contexts. They could be dependent on hooks, context providers, or even have their own internal state management beyond standard shown/hidden/hover/focus flags. They are often the most complex and feature-rich components in a design system.
- A **Provider** is a component that provides context to its children. It is used to manage state and share data across the component tree. They are not meant to be used directly in the UI, but rather as a wrapper around other components that need access to the provided context.
- A **Template** is a group of organisms that form a page. It is a high-level component that defines the overall structure and layout of a page, but does not include any specific content. It is meant to be used as a starting point for creating new pages, and can be customized with different organisms and content to create unique pages.
- A **Page** is a specific instance of a template that includes specific content and is meant to be rendered in the application. It is the final product that users interact with, and can be considered as the end result of the design system's components and templates.

- Somewhat between Particles and Atoms: These are often common atom components that are dependant of particles to be used. For example titles, or typography components that are dependant of a variant particle to implement styling. In these cases, the component should be an atom and the corresponding variants should be passed as an enum prop. Optional props to handle the html element to be use (span, p, h1, h2, etc) can be added. The best example of this is the Typography component, which is is not a component on itself but a set of examples on how to style and affect text via variants, and css classes. 
- Somewhat between Atoms and Molecules: Special cases exist where an atom could include a wrapper component to handle groupings or context between sibling components. This component should fall into atom or molecule depending on whether the grouping component is not / cannot be provided/exported as an independent molecule and if the atom that's grouped cannot be used independently of the wrapper.
- Somewhat between Molecules and Organisms: Special cases exist where a molecule could include other molecules. This is often the case when a molecule is meant to be used as a standalone component, but also as a building block for more complex components. In this case, the molecule should be considered as an organism if it has its own internal state management or if it is meant to be used as a standalone component, and as a molecule if it is only meant to be used as a building block for other components.

## Suggested component organization for shadcn based components. 
### Particles

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
Calendar
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

# Templates
Navigation Menu
Sheet
Sidebar
Tabs

### Providers
Direction