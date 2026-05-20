import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { resolve } from "node:path";

const atoms = [
  "AspectRatio",
  "Avatar",
  "Badge",
  "Button",
  "Card",
  "Checkbox",
  "Input",
  "Kbd",
  "Label",
  "Progress",
  "ScrollArea",
  "Separator",
  "Skeleton",
  "Slider",
  "Spinner",
  "Textarea",
  "Toggle",
  "Typography",
] as const;

export default defineConfig({
  plugins: [
    react(),
    dts({ include: ["src"], tsconfigPath: "./tsconfig.build.json" }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        particles: resolve(__dirname, "src/particles/index.ts"),
        ...Object.fromEntries(
          atoms.map((a) => [
            `atoms/${a}`,
            resolve(__dirname, `src/atoms/${a}/index.ts`),
          ]),
        ),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        /^react($|\/)/,
        /^react-dom($|\/)/,
        /^@radix-ui\//,
        "class-variance-authority",
        "clsx",
        "tailwind-merge",
      ],
      output: {
        preserveModules: false,
        entryFileNames: "[name].js",
      },
    },
    sourcemap: true,
    target: "es2022",
  },
});
