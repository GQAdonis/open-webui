# React and Svelte Artifacts Usage Guide

## 🚀 Application Status

✅ **READY TO USE** - The application builds successfully and includes full React and Svelte artifact support.

## 🎯 What's New

The OpenWebUI now supports:
- **React/JSX/TSX artifacts** with shadcn/ui component library
- **Svelte artifacts** with shadcn-svelte component library  
- **Live preview** using the same Sandpack infrastructure as LibreChat
- **Tailwind CSS** styling support for both frameworks
- **Error handling** with fallback code display

## 📝 Prompt Examples for AI Models

### Basic React Artifact
```
Create a React component for a todo list with add, delete, and toggle functionality.

```tsx
import React, { useState } from 'react';

export default function TodoApp() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn React', completed: false }
  ]);
  const [newTodo, setNewTodo] = useState('');

  const addTodo = () => {
    if (newTodo.trim()) {
      setTodos([...todos, {
        id: Date.now(),
        text: newTodo,
        completed: false
      }]);
      setNewTodo('');
    }
  };

  // ... rest of component
}
```

### React with shadcn/ui Components
```
Create a modern dashboard using shadcn/ui components:

{
  "type": "react",
  "title": "Analytics Dashboard",
  "entryCode": "import React from 'react';\nimport { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';\nimport { Button } from '@/components/ui/button';\n\nexport default function Dashboard() {\n  return (\n    <div className=\"p-6\">\n      <Card>\n        <CardHeader>\n          <CardTitle>Welcome to Dashboard</CardTitle>\n        </CardHeader>\n        <CardContent>\n          <Button>Get Started</Button>\n        </CardContent>\n      </Card>\n    </div>\n  );\n}",
  "useShadcn": true,
  "dependencies": {
    "lucide-react": "^0.263.1"
  }
}
```

### Basic Svelte Artifact
```
Create a Svelte component for a counter:

```svelte
<script>
  let count = 0;
  
  function increment() {
    count += 1;
  }
  
  function decrement() {
    count -= 1;
  }
</script>

<div class="counter">
  <h1>Count: {count}</h1>
  <button on:click={increment}>+</button>
  <button on:click={decrement}>-</button>
</div>

<style>
  .counter {
    text-align: center;
    padding: 20px;
  }
  
  button {
    margin: 0 10px;
    padding: 10px 20px;
    font-size: 16px;
  }
</style>
```

### Svelte with shadcn-svelte Components
```
Create a task management interface with shadcn-svelte:

{
  "type": "svelte",
  "title": "Task Manager",
  "entryCode": "<script>\n  import { Button } from '$lib/components/ui/button';\n  import { Input } from '$lib/components/ui/input';\n  import { Card } from '$lib/components/ui/card';\n  \n  let tasks = ['Complete project', 'Review code'];\n  let newTask = '';\n  \n  function addTask() {\n    if (newTask.trim()) {\n      tasks = [...tasks, newTask];\n      newTask = '';\n    }\n  }\n</script>\n\n<div class=\"p-6\">\n  <Card className=\"max-w-md mx-auto p-4\">\n    <h2 class=\"text-xl font-bold mb-4\">My Tasks</h2>\n    \n    <div class=\"flex gap-2 mb-4\">\n      <Input bind:value={newTask} placeholder=\"Add new task\" />\n      <Button on:click={addTask}>Add</Button>\n    </div>\n    \n    {#each tasks as task}\n      <div class=\"p-2 bg-gray-100 rounded mb-2\">{task}</div>\n    {/each}\n  </Card>\n</div>",
  "useShadcn": true
}
```

## 🔍 How Detection Works

The system automatically detects artifacts based on:

### Code Fence Detection
- **React**: `tsx`, `jsx` code blocks
- **Svelte**: `svelte` code blocks

### JSON Envelope Detection  
- Structured JSON with `type: "react"` or `type: "svelte"`
- Supports additional metadata like dependencies and presets

### Examples of What Triggers Detection:

✅ **DETECTED** - Will render as artifact:
- `\`\`\`tsx` followed by React code
- `\`\`\`svelte` followed by Svelte code  
- JSON with `{"type": "react", "entryCode": "..."}`
- JSON with `{"type": "svelte", "entryCode": "..."}`

❌ **NOT DETECTED** - Will display as regular code:
- `\`\`\`javascript` (generic JS)
- `\`\`\`html` (regular HTML)
- Plain text without markers

## 🎨 Available UI Libraries

### React Artifacts
- **shadcn/ui components**: Button, Card, Input, Badge, Progress, etc.
- **Lucide React icons**: Comprehensive icon library
- **Tailwind CSS**: Full utility-first CSS framework
- **React Hooks**: useState, useEffect, etc.

### Svelte Artifacts  
- **shadcn-svelte components**: Button, Card, Input, Badge, etc.
- **Lucide Svelte icons**: Complete icon set for Svelte
- **Tailwind CSS**: Same utility classes as React
- **Svelte features**: Reactive statements, stores, etc.

## 🛠️ Prompting Tips for Best Results

### For AI Models Creating Artifacts:

1. **Be Specific About Framework**:
   - "Create a React component..." 
   - "Build a Svelte component..."

2. **Request Modern Features**:
   - "Use shadcn/ui components"
   - "Style with Tailwind CSS"  
   - "Include interactive features"

3. **Specify Format**:
   - "Wrap in tsx code fence" 
   - "Provide as JSON artifact"
   - "Include dependencies if needed"

### Example Prompt Templates:

**For Complex React Apps**:
```
Create a React dashboard component using shadcn/ui that displays:
- User statistics cards
- A progress indicator
- Interactive buttons
- Use Tailwind for responsive design
- Include useState for interactivity

Format as JSON artifact with useShadcn: true
```

**For Svelte Components**:
```
Build a Svelte contact form with:
- Input validation
- Submit handling  
- Success/error states
- Use shadcn-svelte components
- Style with Tailwind CSS

Provide in svelte code fence format
```

## 🚦 Environment Controls

Artifact support can be toggled via environment variables:
- `PUBLIC_REACT_ARTIFACTS_ENABLED=true` - Enable React artifacts
- `PUBLIC_SVELTE_ARTIFACTS_ENABLED=true` - Enable Svelte artifacts

## 🔧 Technical Notes

- Uses **Sandpack** for live preview (same as LibreChat)
- **Bundler URL**: `https://preview.prometheusags.ai`
- **Fallback behavior**: Shows code when preview fails
- **Error handling**: Graceful degradation with error messages
- **Performance**: Cached dependencies, lazy loading

## ✅ Ready to Use!

The application is fully configured and ready. Users can now create interactive React and Svelte components that will render with live previews in the chat interface!
