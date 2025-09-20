Yes — you can add **Svelte artifacts** to Open WebUI the same way we did React: plug in **Sandpack** with your **self-hosted bundler** and (optionally) a **static preview server**, add a **detector** for Svelte outputs, and a **renderer** that uses Sandpack’s template: "svelte" (Vite-based). Sandpack officially supports Svelte templates, and you can self-host the bundler and point the renderer at bundlerURL. 



Below is a **PR-ready patch plan** with minimal code you can drop into your fork.



------





# **1) What Sandpack gives you (Svelte)**





- **Svelte template support** (Vite 4): first-class in Sandpack; you can run Svelte code in the browser with a hosted or self-hosted bundler. 
- **Self-hosted bundler** + bundlerURL option in sandpack-react for privacy/perf and CSP control. 
- If you ever want a lower-level wrapper or a non-React host, the **Sandpack Client** works with Svelte as well. 





> Caveat: some projects reported edge-case hiccups with Svelte in Sandpack; it’s generally workable, but keep an escape hatch (simple iframe preview or SvelteKit viewer) if you hit a template quirk. 



------





# **2) Env flags (reuse the React ones)**





.env:

```
REACT_ARTIFACTS_ENABLED=true
SVELTE_ARTIFACTS_ENABLED=true
SANDPACK_BUNDLER_URL=https://your-bundler.example.com
SANDPACK_PREVIEW_URL=https://preview.example.com   # optional
```

(We’ll reuse the same bundler/preview for both React and Svelte.) 



------





# **3) Detector for Svelte artifacts**





Support both **code fences** and a **JSON envelope**:



web/src/lib/artifacts/detectArtifacts.ts

```
export type DetectedArtifact =
  | { type: 'react'; /* ... */ }
  | { type: 'svelte'; title?: string; entryCode: string; css?: string; extraFiles?: Record<string,string>; dependencies?: Record<string,string> }
  | { type: 'html'|'svg'|'mermaid'; /* existing */ };

const SVELTE_FENCE = /```svelte\s+([\s\S]*?)```/m;

export function detectArtifactsFromText(text: string): DetectedArtifact[] {
  const out: DetectedArtifact[] = [];

  // 1) ```svelte ... ```
  const m = SVELTE_FENCE.exec(text);
  if (m) {
    out.push({ type: 'svelte', title: 'Svelte Artifact', entryCode: m[1] });
  }

  // 2) JSON envelope: { artifact: { type:'svelte', files:{ '/App.svelte': '...' }, dependencies:{} } }
  try {
    const j = JSON.parse(text);
    if (j?.artifact?.type === 'svelte') {
      const files = j.artifact.files ?? {};
      const entry = files['/App.svelte'] ?? files['App.svelte'];
      if (entry) {
        out.push({
          type: 'svelte',
          title: j.artifact.title,
          entryCode: entry,
          extraFiles: files,
          dependencies: j.artifact.dependencies ?? {},
          css: j.artifact.css ?? undefined,
        });
      }
    }
  } catch {/* not JSON */}

  // ...existing detectors...
  return out;
}
```



------





# **4) Svelte renderer (Sandpack)**





web/src/components/artifacts/SvelteArtifactRenderer.tsx

```
import React from "react";
import { SandpackProvider, SandpackPreview, SandpackCodeEditor } from "@codesandbox/sandpack-react";
import "@codesandbox/sandpack-react/dist/index.css";

const BUNDLER_URL = process.env.SANDPACK_BUNDLER_URL || "";
const PREVIEW_URL  = process.env.SANDPACK_PREVIEW_URL || "";

const BASE_DEPS = {
  "svelte": "^4.2.0" // pick a version your bundler supports well
};

export default function SvelteArtifactRenderer({ artifact }: {
  artifact: { title?: string; entryCode: string; css?: string; extraFiles?: Record<string,string>; dependencies?: Record<string,string> }
}) {
  const files: Record<string,string> = {
    "/index.html": `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>${artifact.title ?? "Svelte Artifact"}</title>
    ${artifact.css ? `<style>${artifact.css}</style>` : ""}
  </head>
  <body><div id="app"></div></body>
</html>`.trim(),
    "/main.js": `
import App from "./App.svelte";
const app = new App({ target: document.getElementById("app") });
export default app;
`.trim(),
    "/App.svelte": artifact.entryCode,
    ...(artifact.extraFiles ?? {})
  };

  return (
    <div className="artifact-panel">
      <SandpackProvider
        template="svelte"
        files={files}
        customSetup={{ dependencies: { ...BASE_DEPS, ...(artifact.dependencies ?? {}) } }}
        options={{ bundlerURL: BUNDLER_URL || undefined }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-xl overflow-hidden border">
            <SandpackPreview showOpenInCodeSandbox={false} showRefreshButton />
          </div>
          <div className="rounded-xl overflow-hidden border">
            <SandpackCodeEditor showLineNumbers showRunButton />
          </div>
        </div>
      </SandpackProvider>
    </div>
  );
}
```

Why this works: Sandpack supports Svelte/Vite templates; you just provide /index.html, /main.js, and /App.svelte, plus deps. 



------





# **5) Switch it on in the artifact router**





web/src/components/artifacts/Artifact.tsx

```
 import HtmlArtifactRenderer from "./HtmlArtifactRenderer";
 import SvgArtifactRenderer from "./SvgArtifactRenderer";
 import ReactArtifactRenderer from "./ReactArtifactRenderer";
+import SvelteArtifactRenderer from "./SvelteArtifactRenderer";
 import type { DetectedArtifact } from "../../lib/artifacts/detectArtifacts";

 export default function Artifact({ artifact }: { artifact: DetectedArtifact }) {
   const enableReact  = (process.env.REACT_ARTIFACTS_ENABLED  ?? "false") === "true";
+  const enableSvelte = (process.env.SVELTE_ARTIFACTS_ENABLED ?? "false") === "true";
   switch (artifact.type) {
     case "react":
       if (!enableReact) return null;
       // @ts-ignore
       return <ReactArtifactRenderer artifact={artifact} />;
+    case "svelte":
+      if (!enableSvelte) return null;
+      // @ts-ignore
+      return <SvelteArtifactRenderer artifact={artifact} />;
     case "html": return <HtmlArtifactRenderer artifact={artifact} />;
     case "svg":  return <SvgArtifactRenderer artifact={artifact} />;
     default:     return null;
   }
 }
```



------





# **6) Admin: show flags in Settings**





Add a read-only section (like we did for React) indicating SVELTE_ARTIFACTS_ENABLED, bundler/preview URLs.



------





# **7) E2E smoke tests (Playwright)**





e2e/svelte-artifacts.spec.ts

```
import { test, expect } from "@playwright/test";

test("renders Svelte fence artifact", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").fill(
    "```svelte\n<script>let name='Svelte';</script>\n<h1>Hello {name}!</h1>\n```"
  );
  await page.getByRole("button", { name: /send/i }).click();

  const iframe = page.frameLocator("iframe");
  await expect(iframe.getByText("Hello Svelte!")).toBeVisible({ timeout: 20000 });
});

test("renders Svelte JSON artifact with extra files", async ({ page }) => {
  await page.goto("/");
  const payload = {
    artifact: {
      type: "svelte",
      title: "Counter",
      dependencies: { svelte: "^4.2.0" },
      files: {
        "/App.svelte": `<script>let c=0;</script><button on:click={() => c++}>Count: {c}</button>`
      }
    }
  };
  await page.getByRole("textbox").fill(JSON.stringify(payload));
  await page.getByRole("button", { name: /send/i }).click();

  const iframe = page.frameLocator("iframe");
  await expect(iframe.getByRole("button", { name: /Count:/ })).toBeVisible({ timeout: 20000 });
});
```

Playwright + iframe expectations: same patterns we used for React artifacts. 



------





# **8) CSP / CORS reminders**





Exactly the same as React artifacts: allow your **bundler** and **preview** origins in frame-src (and connect-src if the preview or bundler fetches packages). Sandpack’s bundler hosting guide shows how to pass bundlerURL; several GH issues document common self-hosting pitfalls (CORS/timeouts). 



------





# **9) Optional: Svelte via Sandpack Client (no React host)**





If you prefer a smaller footprint (or a Svelte-native host component), you can use **@codesandbox/sandpack-client** directly and wrap it in your own Svelte component. This library is intended for custom wrappers in any framework. 



------





# **10) Quick “it works” snippet to paste in chat**





**Svelte fence** you can use as a demo:

````
```svelte
<script>
  let user = 'Prometheus';
</script>

<main style="font-family: system-ui; padding: 16px">
  <h2>Hello {user} 👋</h2>
  <p>This Svelte artifact is running in Sandpack with your self-hosted bundler.</p>
</main>
```
````



------





## **Sources**





- Sandpack docs: getting started, hosting bundler, client API, frameworks list (Svelte supported) 
- Open WebUI artifacts (baseline HTML/CSS/JS support today) 
- Example Svelte sandboxes & notes; caveat from React Flow team about early Svelte support quirks (keep an escape hatch) 





------



If you want, I can roll this into a single **git diff** against your current branch (alongside the React artifacts patch) and include a toggle in Admin for SVELTE_ARTIFACTS_ENABLED.



Short answer: yes—you can support **shadcn-svelte** (Svelte) and **shadcn/ui** (React, incl. the **canary** sidebar) inside Open WebUI artifacts by extending the Sandpack-based artifact renderers you already added. The key is to (1) detect Svelte/React artifacts, (2) feed Sandpack a project **template + virtual files** for Tailwind + shadcn, and (3) let your **self-hosted bundler URL** compile them. Below is a PR-ready plan with the exact deps, files, and switches.



------





# **What the upstreams require (so Sandpack succeeds)**





- **shadcn/ui (React)** needs Tailwind + a few core deps (class-variance-authority, clsx, tailwind-merge, lucide, tw-animate-css) and Radix UI primitives. Their official install docs confirm Tailwind and dependency set; Tailwind v4 uses **tw-animate-css** (not tailwindcss-animate). 
- **shadcn/ui “canary”** exposes CLI flags and monorepo behavior; you can add components like **Sidebar** with npx shadcn@canary add sidebar. 
- **shadcn-svelte** is the Svelte port with its own CLI/schema and Tailwind v4 guidance; it works in Svelte (SvelteKit) and documents v4 migration. 
- **Sandpack** supports **Svelte** and **React** templates and lets you point to your **self-hosted bundler** via bundlerURL. 
- The **shadcn/ui Sidebar** component exists (and is “canary”-ready). 





------





# **High-level: how to wire both stacks into artifacts**







## **1) React (shadcn/ui + canary + Sidebar)**





- Keep your **ReactArtifactRenderer** (Sandpack, template: "react-ts").
- Add a **“shadcnPreset: true”** toggle in the artifact envelope. When present, inject Tailwind files + core deps + (optional) pre-baked **Sidebar** component files.







### **React deps to feed Sandpack (**

### **customSetup.dependencies**

### **)**



```
{
  "react": "^18",
  "react-dom": "^18",
  "lucide-react": "^0.460.0",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.1.0",
  "tailwind-merge": "^2.3.0",
  "tw-animate-css": "^0.8.0",
  "@radix-ui/react-slot": "^1.0.2",
  "@radix-ui/react-scroll-area": "^1.0.5",
  "@radix-ui/react-collapsible": "^1.0.3"
}
```

(These mirror the shadcn/ui docs; v4 prefers **tw-animate-css**.) 





### **React virtual files to inject**





- /tailwind.config.js (minimal v4 style) + /postcss.config.js
- /src/index.css with @import "tw-animate-css"; + Tailwind layers
- glue into index.tsx (import /src/index.css)
- **Optional**: pre-baked Sidebar files so artifacts can render without running the CLI





> The **canary Sidebar** structure and docs are published; we’re not running npx shadcn add in the sandbox—so we ship the component code as *virtual files* when the artifact asks for shadcnPreset. 





## **2) Svelte (shadcn-svelte)**





- Add a **SvelteArtifactRenderer** (Sandpack, template: "svelte").
- Toggle **“shadcnSveltePreset: true”** to inject Tailwind v4 setup + base shadcn-svelte deps and a sample component.







### **Svelte deps to feed Sandpack**



```
{
  "svelte": "^4",
  "svelte-hmr": "^0.15.3",
  "@tailwindcss/forms": "^0.5.7",
  "tailwindcss": "^4.0.0",
  "autoprefixer": "^10.4.20",
  "postcss": "^8.4.47",
  "shadcn-svelte": "^0.9.0"
}
```

(You can adjust versions; shadcn-svelte documents Tailwind v4/Svelte 5 paths as well.) 





### **Svelte virtual files to inject**





- /tailwind.config.js, /postcss.config.js, /src/app.css with Tailwind layers
- /index.html, /main.js, /App.svelte
- Optional **shadcn-svelte** component files (e.g., Button.svelte, a simple Sidebar.svelte sample) bundled as virtual files since the CLI normally writes to disk. 





------





# **Patch set (concise)**







## **A) Artifact envelope (new knobs)**





Allow authors (your agent or user) to request the presets.

```
{
  "artifact": {
    "type": "react",                 // or "svelte"
    "title": "Sidebar Demo",
    "shadcnPreset": true,            // React shadcn/ui
    "shadcnSveltePreset": false,     // Svelte shadcn-svelte
    "files": { "/App.tsx": "..." },  // component files
    "dependencies": { }              // extra libs if needed
  }
}
```



## **B) React renderer: add a preset helper**





Extend your ReactArtifactRenderer to inject Tailwind + shadcn/ui files and deps when artifact.shadcnPreset === true.



- **What to inject** (minimal):

  

  - /tailwind.config.js from shadcn/ui docs (v4) with your content globs
  - /postcss.config.js
  - /src/index.css:

  



```
@import "tw-animate-css";
@tailwind base;
@tailwind components;
@tailwind utilities;
```



- 

  - 
  - ensure index.tsx imports ./src/index.css
  - **Sidebar** boilerplate: copy the structure from shadcn/ui sidebar docs into /components/ui/sidebar.tsx & a small page that uses it. 

  

- **Dependencies**: merge the list shown above with artifact.dependencies.

- **Why**: shadcn/ui’s official guidance is Tailwind + those deps; v4 note (tw-animate-css) is explicit. 







## **C) Svelte renderer: add a preset helper**





Extend your SvelteArtifactRenderer to inject Tailwind v4 + shadcn-svelte:



- /tailwind.config.js, /postcss.config.js, /src/app.css (Tailwind layers)
- In /main.js add import "./app.css"
- Provide a tiny Sidebar.svelte or Button.svelte from shadcn-svelte as a demo, or expect the artifact to include those files.
- Confirm you’re aligned with **shadcn-svelte Tailwind v4** notes. 







## **D) Admin toggles**





Add read-only indicators (you already did for React) for:



- SVELTE_ARTIFACTS_ENABLED
- SANDPACK_BUNDLER_URL / SANDPACK_PREVIEW_URL







## **E) CSP**





Make sure frame-src + connect-src allow your bundler + preview origins so the compiled Tailwind + shadcn assets load. 



------





# **Example: React artifact payload (canary sidebar)**





Paste this in chat to preview the **canary sidebar** in your artifact panel:

```
{
  "artifact": {
    "type": "react",
    "title": "shadcn/ui Sidebar (canary) Demo",
    "shadcnPreset": true,
    "dependencies": {
      "@radix-ui/react-separator": "^1.0.3"
    },
    "files": {
      "/App.tsx": "import React from 'react';\nimport './src/index.css';\nimport { DemoSidebar } from './components/demo-sidebar';\nexport default function App(){\n  return <div style={{height:'100vh'}}><DemoSidebar/></div>;\n}",
      "/components/demo-sidebar.tsx": "/* build from https://ui.shadcn.com/docs/components/sidebar */\nimport * as React from 'react'\nimport { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarProvider, SidebarTrigger } from './ui/sidebar'\nexport function DemoSidebar(){\n  return (\n    <SidebarProvider>\n      <Sidebar>\n        <SidebarHeader>Header</SidebarHeader>\n        <SidebarContent>\n          <SidebarGroup>Nav item A</SidebarGroup>\n          <SidebarGroup>Nav item B</SidebarGroup>\n        </SidebarContent>\n        <SidebarFooter>Footer</SidebarFooter>\n      </Sidebar>\n      <main style={{padding:16}}>\n        <SidebarTrigger/> Content area\n      </main>\n    </SidebarProvider>\n  )\n}",
      "/components/ui/sidebar.tsx": "/* minimal sidebar primitives per https://ui.shadcn.com/docs/components/sidebar */\nexport { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarProvider, SidebarTrigger } from './_sidebar-impl';\n",
      "/components/ui/_sidebar-impl.tsx": "/* In your repo, paste the real shadcn/ui Sidebar source from docs or CLI output */\nexport const SidebarProvider = ({children}:{children:any})=>children as any; export const Sidebar=(p:any)=>(<aside style={{width:240,borderRight:'1px solid #eee',height:'100%',position:'fixed',left:0,top:0}}>{p.children}</aside>); export const SidebarHeader=({children}:any)=>(<div style={{padding:12,borderBottom:'1px solid #eee'}}>{children}</div>); export const SidebarFooter=({children}:any)=>(<div style={{padding:12,borderTop:'1px solid #eee',position:'absolute',bottom:0,width:'100%'}}>{children}</div>); export const SidebarContent=({children}:any)=>(<div style={{padding:12,marginBottom:48,marginTop:48}}>{children}</div>); export const SidebarGroup=({children}:any)=>(<div style={{padding:8}}>{children}</div>); export const SidebarTrigger=()=> <button style={{marginLeft:260}}>Toggle</button>;\n"
    }
  }
}
```

> In your real fork, replace _sidebar-impl.tsx with the **actual** canary Sidebar components brought in by npx shadcn@canary add sidebar (or copy from the official docs). Docs make the structure and parts clear. 



------





# **Example: Svelte artifact payload (shadcn-svelte)**



```
{
  "artifact": {
    "type": "svelte",
    "title": "shadcn-svelte Button",
    "shadcnSveltePreset": true,
    "files": {
      "/App.svelte": "<script>let n=0;</script>\n<button class='btn' on:click={() => n++}>Count: {n}</button>\n<style>.btn{@apply px-3 py-2 rounded-lg bg-black text-white}</style>"
    }
  }
}
```

> For production, inject actual shadcn-svelte components as files (the CLI normally writes files to disk). Use their docs/CLI or schema to fetch the component code and place it into Sandpack’s virtual FS at artifact-render time. Tailwind v4 note for Svelte is documented. 



------





# **Extra: quality-of-life options**





- **Preset packer**: create applyShadcnReactPreset(files,deps) and applyShadcnSveltePreset(files,deps) utilities that add Tailwind configs and minimal UI primitives automatically.
- **Admin toggle** to pre-include a **starter library** of commonly used components (Button, Input, Sidebar) so an artifact can simply import from /components/ui/... without shipping the files each time.
- **Version pins**: follow shadcn/ui React 19 & Next 15 guidance if you target those features; canary docs call out flags/compat. 





------





## **Quick checklist to ship**





1. Enable SVELTE_ARTIFACTS_ENABLED=true and keep using your SANDPACK_BUNDLER_URL/PREVIEW_URL. 
2. Merge the **SvelteArtifactRenderer** and **detector** (```svelte and JSON).
3. Add **shadcn presets** in both renderers (Tailwind v4 files + deps).
4. (Nice-to-have) Provide **prebaked Sidebar** and **Button** in your repo to avoid huge envelopes from the model.
5. Update **CSP** to allow bundler/preview origins.





If you want, I’ll produce a small **git diff** against your current patch that adds:



- SvelteArtifactRenderer.tsx
- detectArtifacts updates
- applyShadcnReactPreset / applyShadcnSveltePreset helpers
- Playwright tests for a Svelte button and the React canary sidebar.



Great question. Open WebUI is a **Svelte** app, while the “batteries-included” Sandpack UI is **React** (@codesandbox/sandpack-react). You have three solid integration paths, and only one of them *requires* React.





# **The short answer**





Use **@codesandbox/sandpack-client** in a Svelte component. It’s **framework-agnostic**, talks directly to the bundler/preview iframes, and avoids pulling React into your Svelte app. If you *want* the ready-made React editor/preview UI, you can still mount it from Svelte with a tiny React adapter, but the cleanest path for Open WebUI is the client API. 



------





# **Option A (recommended): Framework-agnostic** 

# **Sandpack Client**

#  **in Svelte**





Sandpack ships a low-level client specifically for non-React hosts. You create an <iframe>, point it at your **self-hosted bundler** (bundlerURL) and optionally a **static preview server**, then drive files/updates from Svelte. 



**Why this is best for Open WebUI**



- No React dependency inside your Svelte app.
- Full control of artifact detection/rendering in your Svelte “Artifacts” panel. (OWUI already treats artifacts as a first-class concept.) 
- You can reuse the same self-hosted **bundler** / **preview** setup you planned for React artifacts. 





**Tiny sketch (Svelte)**

```
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { loadSandpackClient, SandpackClient } from "@codesandbox/sandpack-client";

  export let files: Record<string, string>;   // virtual FS for the artifact
  export let template = "react-ts";           // or "svelte", "vanilla", etc.
  const bundlerURL = import.meta.env.VITE_SANDBACK_BUNDLER_URL;

  let iframeEl: HTMLIFrameElement;
  let client: SandpackClient;

  onMount(async () => {
    client = await loadSandpackClient(iframeEl, { files, template }, { bundlerURL });
    // later: client.updateFiles(newFiles), client.getStatus(), etc.
  });

  onDestroy(() => client?.destroy());
</script>

<iframe bind:this={iframeEl} style="width:100%;height:400px;border:1px solid #eee;" />
```

Docs: “Sandpack Client” + bundler/preview hosting + static server controller. 



------





# **Option B: Mount** 

# **React Sandpack**

#  **from Svelte (micro-adapter)**





If you want the full React UI (SandpackProvider, editor, preview), render it into a Svelte node with ReactDOM.createRoot. This is a known approach for embedding React widgets in Svelte. 



**How**



1. npm i react react-dom @codesandbox/sandpack-react.
2. In a Svelte component’s onMount, create a root and render your React tree into a placeholder div.
3. Pass options={{ bundlerURL }} to Sandpack so it uses your self-hosted bundler. 





Pros: you get the polished React editor quickly.

Cons: you ship React inside a Svelte app and manage two ecosystems.



------





# **Option C: iFrame a small React “artifact viewer” app**





Run a tiny React app (with Sandpack React) on a separate route/origin and embed it with an <iframe> from Svelte. This is the “micro-frontend” route—clean isolation, but more moving parts.



------





# **Practical notes (relevant to Open WebUI)**





- **Artifacts in OWUI** are already iframe-friendly; dropping a Sandpack **client** preview there is natural and avoids framework mixing. 
- **Svelte support in Sandpack** exists (template "svelte"). Historically there were some rough edges; teams sometimes swap to an iframe fallback for Svelte examples. Using the low-level client keeps you future-proof. 
- Make sure you **self-host the bundler** and set bundlerURL (and **static preview** if you want networkable sandboxes) in your renderer. 





------





# **What I’d implement for you (step-by-step)**





1. **Svelte artifact renderer** using **@codesandbox/sandpack-client** (Option A).

   

   - Accept files, template, dependencies, title.
   - Initialize client with bundlerURL from env; wire preview height/resizer.

   

2. **React artifact support** (already specced): for consistency, also route through the same Svelte wrapper by passing template: "react-ts" + files. (You only need the React library *inside the sandbox*, not in Open WebUI.)

3. **Admin settings**: inputs for SANDPACK_BUNDLER_URL / SANDPACK_PREVIEW_URL; update CSP frame-src & connect-src. 

4. **Tests**: Playwright checks that the iframe renders output and no “TIME_OUT” console errors (common misconfig on self-hosting). 





If you decide you want the *React* editor UI **inside** the Svelte app, I’ll add the tiny createRoot adapter (Option B). Otherwise, the **client API** is the smoothest Svelte-native path.
