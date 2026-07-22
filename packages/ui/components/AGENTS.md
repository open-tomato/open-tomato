# Open Tomato - Component
This is a component library based on our Design System demo for the Open Tomato project. These are the building blocks for our apps and UI-based packages.

## Tech stack:
The tech stack consists of React components with TypeScript, using Radix UI primitives for accessibility and headless behavior, Tailwind CSS for styling, and Class Variant Authority (CVA) for managing classes to component variants. The use of classes directly to components is discouraged, and the styling should be covered by variants and flags on the main component and not fine grained styling. These variants should be covered in the component definition and not in the implementation side.

## Project structure
Our project structure is organized in the atomic design pattern, with folders for each type of component (atoms, molecules, organisms, templates), then Pages and their internal content/layouts organized inside their folders. Each component is defined in its own folder with a structure similar to this:
-  a barrel exporter `index.ts` file.
-  a `{component}.tsx` file for the component definition.
-  a `{component}.variants.ts` file for the CVA definitions.
-  a `{component}.stories.tsx` for the Storybook stories.
-  optionally a component that's a molecule and above, can include smaller atoms in its folder that are only meant to be used in that molecule. If it helps keeping file definition smaller and more readable. For example, a `Table` component can include smaller `TableCell`, `TableRow`, `TableHeader`, `TableFooter` components that are only meant to be used inside the `Table` molecule. These smaller components should be defined in their own files and exported through the main barrel exporter of the molecule. Variants and stories should be defined for the main component file and not for the smaller atom files.


## JSX to TSX:
In some cases importing from the design system demo will include static JSX files. These files need to be refactored to TSX and types need to be added.
When refactoring a JSX component file that was created as part of a demo site for our web kit / design system we need to move gradually to streamline the process.

### Steps to follow:
1. Read the whole file to understand which components we have and what's the main domain/entity it's being handled inside.
2. Solve main domain/entity types and interfaces. This might be updated later if inline errors are found that are related to union types of properties (ie: A form considering multiple types of skills/tools can relate to 3 different interfaces based on a type).
3. Solve function/component interfaces for params/props. 
4. Solve inline error types. Some commons scenarios are:
   1. State initialization with a default value that is not typed (ie: useState(null) or useState([]) or useState({})).
   2. Missing prop from the domain/entity type. Consider if it should be optional.
   3. Mismatching types on properties due to union types. Suggested solution: Use type guards to cast the right type based on the prop value (check how @ui_kits/dashboard/components/Tools.tsx is using `isMCPTool()`, `isisSkillTool()`, `isAPITool()`).
   4. Icon name="..." complains most of the time. This component will be replaced at a later stage, and for now we're using a placeholder component. Suggested fix: should be simply solved with `as any` for now. 

### Important considerations:
- **Do not** creep out to other files. Only solve types for the file being edited.
- **Do not** change html, style or classes. The layout and styling is correct.
- **Do not** change property names for objects being used to hydrate components. Data types are not defined but the structure used on markup of the components is to be used as guide.
- **Do not** change function names. 
