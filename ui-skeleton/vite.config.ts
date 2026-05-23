import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const atoms = [
  'AspectRatio',
  'Avatar',
  'Badge',
  'Button',
  'Card',
  'Checkbox',
  'Input',
  'Kbd',
  'Label',
  'Progress',
  'ScrollArea',
  'Separator',
  'Skeleton',
  'Slider',
  'Spinner',
  'Textarea',
  'Toggle',
  'Typography',
] as const;

const molecules = [
  'Alert',
  'ButtonGroup',
  'Collapsible',
  // 'ContextMenu', // re-add once the ContextMenu molecule task unblocks
  'HoverCard',
  'InputOTP',
  'Item',
  'NativeSelect',
  'Popover',
  'RadioGroup',
  'Select',
  'Switch',
  'Table',
  'ToggleGroup',
  'Tooltip',
] as const;

const organisms = [
  'Accordion',
  'AlertDialog',
  'Breadcrumb',
  'Calendar',
  'Combobox',
  'Command',
  'DataTable',
  'Dialog',
  'Drawer',
  'DropdownMenu',
  'Empty',
  'Field',
  'InputGroup',
  'Menubar',
  'Pagination',
  'Resizable',
  'Sonner',
] as const;

const templates = [
  'NavigationMenu',
  'Sheet',
  'Sidebar',
  'Tabs',
] as const;

const rootDir = import.meta.dirname;

export default defineConfig({
  plugins: [
    react(),
    dts({ include: ['src'], tsconfigPath: './tsconfig.build.json' }),
  ],
  resolve: {
    alias: {
      '@': resolve(rootDir, 'src'),
    },
  },
  build: {
    lib: {
      entry: {
        index: resolve(rootDir, 'src/index.ts'),
        particles: resolve(rootDir, 'src/particles/index.ts'),
        atoms: resolve(rootDir, 'src/atoms/index.ts'),
        molecules: resolve(rootDir, 'src/molecules/index.ts'),
        organisms: resolve(rootDir, 'src/organisms/index.ts'),
        templates: resolve(rootDir, 'src/templates/index.ts'),
        ...Object.fromEntries(
          atoms.map((a) => [
            `atoms/${a}`,
            resolve(rootDir, `src/atoms/${a}/index.ts`),
          ]),
        ),
        ...Object.fromEntries(
          molecules.map((m) => [
            `molecules/${m}`,
            resolve(rootDir, `src/molecules/${m}/index.ts`),
          ]),
        ),
        ...Object.fromEntries(
          organisms.map((o) => [
            `organisms/${o}`,
            resolve(rootDir, `src/organisms/${o}/index.ts`),
          ]),
        ),
        ...Object.fromEntries(
          templates.map((t) => [
            `templates/${t}`,
            resolve(rootDir, `src/templates/${t}/index.ts`),
          ]),
        ),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        /^react($|\/)/,
        /^react-dom($|\/)/,
        /^@radix-ui\//,
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        'vaul',
        'sonner',
        'cmdk',
        'react-resizable-panels',
        'react-day-picker',
      ],
      output: {
        preserveModules: false,
        entryFileNames: '[name].js',
      },
    },
    sourcemap: true,
    target: 'es2022',
  },
});
