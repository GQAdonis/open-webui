export interface ArtifactPresetOptions {
  files: Record<string, string>;
  dependencies: Record<string, string>;
}

// Shadcn/ui React preset configuration
export function applyShadcnReactPreset({ files, dependencies }: ArtifactPresetOptions): ArtifactPresetOptions {
  const shadcnDependencies = {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.460.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0",
    "tw-animate-css": "^0.8.0",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-scroll-area": "^1.0.5",
    "@radix-ui/react-collapsible": "^1.0.3",
    "@radix-ui/react-separator": "^1.0.3"
  };

  const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {}
  },
  plugins: []
}`;

  const postcssConfig = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;

  const indexCss = `@import "tw-animate-css";
@tailwind base;
@tailwind components;
@tailwind utilities;`;

  const shadcnFiles = {
    "/tailwind.config.js": tailwindConfig,
    "/postcss.config.js": postcssConfig,
    "/src/index.css": indexCss,
    "/src/lib/utils.ts": `import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}`,
    "/components/ui/button.tsx": `import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../src/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }`,
    ...files
  };

  // Update the index.tsx to import CSS
  if (shadcnFiles["/index.tsx"] && !shadcnFiles["/index.tsx"].includes("./src/index.css")) {
    shadcnFiles["/index.tsx"] = shadcnFiles["/index.tsx"].replace(
      'import React',
      'import "./src/index.css";\nimport React'
    );
  } else if (shadcnFiles["/src/index.tsx"] && !shadcnFiles["/src/index.tsx"].includes("./index.css")) {
    shadcnFiles["/src/index.tsx"] = shadcnFiles["/src/index.tsx"].replace(
      'import React',
      'import "./index.css";\nimport React'
    );
  }

  return {
    files: shadcnFiles,
    dependencies: { ...shadcnDependencies, ...dependencies }
  };
}

// Shadcn-svelte preset configuration
export function applyShadcnSveltePreset({ files, dependencies }: ArtifactPresetOptions): ArtifactPresetOptions {
  const shadcnSvelteDependencies = {
    "svelte": "^4.2.0",
    "svelte-hmr": "^0.15.3",
    "@tailwindcss/forms": "^0.5.7",
    "tailwindcss": "^4.0.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47"
  };

  const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,svelte}",
    "./App.svelte"
  ],
  theme: {
    extend: {}
  },
  plugins: [require("@tailwindcss/forms")]
}`;

  const postcssConfig = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;

  const appCss = `@tailwind base;
@tailwind components;
@tailwind utilities;`;

  const shadcnSvelteFiles = {
    "/tailwind.config.js": tailwindConfig,
    "/postcss.config.js": postcssConfig,
    "/src/app.css": appCss,
    "/main.js": files["/main.js"] ? 
      files["/main.js"].replace('import App', 'import "./src/app.css";\nimport App') :
      `import "./src/app.css";
import App from "./App.svelte";
const app = new App({ target: document.getElementById("app") });
export default app;`,
    ...files
  };

  return {
    files: shadcnSvelteFiles,
    dependencies: { ...shadcnSvelteDependencies, ...dependencies }
  };
}
