/**
 * Test Data: Realistic AI Response Samples
 *
 * This file contains realistic AI response samples for testing all
 * artifact scenarios, both explicit and implicit creation.
 */

export interface TestArtifactResponse {
  id: string;
  scenario: string;
  userPrompt: string;
  aiResponse: string;
  expectedArtifacts: {
    count: number;
    types: string[];
    identifiers: string[];
    codePatterns: string[];
  };
}

export const EXPLICIT_CREATION_RESPONSES: TestArtifactResponse[] = [
  {
    id: 'react-counter-explicit',
    scenario: 'User explicitly requests React counter component',
    userPrompt: 'Create a React counter component with increment and decrement buttons',
    aiResponse: `I'll create a React counter component for you with increment and decrement functionality:

<artifact identifier="react-counter-component" type="application/vnd.react+tsx" title="Counter Component">
import React, { useState } from 'react';

interface CounterProps {
  initialValue?: number;
  step?: number;
}

export default function Counter({ initialValue = 0, step = 1 }: CounterProps) {
  const [count, setCount] = useState(initialValue);

  const increment = () => setCount(prev => prev + step);
  const decrement = () => setCount(prev => prev - step);
  const reset = () => setCount(initialValue);

  return (
    <div className="counter-container">
      <h2>Counter: {count}</h2>
      <div className="counter-buttons">
        <button onClick={decrement} className="btn btn-secondary">
          - {step}
        </button>
        <button onClick={reset} className="btn btn-outline">
          Reset
        </button>
        <button onClick={increment} className="btn btn-primary">
          + {step}
        </button>
      </div>
    </div>
  );
}
</artifact>

This counter component includes:
- **State management** with React hooks
- **Configurable props** for initial value and step size
- **Three actions**: increment, decrement, and reset
- **TypeScript support** with proper interfaces
- **CSS classes** for styling flexibility

You can use it like this:
\`\`\`tsx
<Counter initialValue={10} step={5} />
\`\`\``,
    expectedArtifacts: {
      count: 1,
      types: ['application/vnd.react+tsx'],
      identifiers: ['react-counter-component'],
      codePatterns: ['useState', 'increment', 'decrement', 'onClick', 'interface']
    }
  },

  {
    id: 'html-page-explicit',
    scenario: 'User explicitly requests HTML page',
    userPrompt: 'Build a complete HTML page with navigation, header, main content, and footer',
    aiResponse: `I'll create a complete HTML page with all the sections you requested:

<artifact identifier="complete-html-page" type="text/html" title="Complete HTML Page">
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Complete Web Page</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }

        /* Navigation */
        nav {
            background: #2c3e50;
            padding: 1rem 0;
            position: sticky;
            top: 0;
            z-index: 100;
        }

        nav ul {
            list-style: none;
            display: flex;
            justify-content: center;
            gap: 2rem;
        }

        nav a {
            color: white;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s ease;
        }

        nav a:hover {
            color: #3498db;
        }

        /* Header */
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 4rem 0;
        }

        header h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
        }

        header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }

        /* Main Content */
        main {
            padding: 3rem 0;
            min-height: 60vh;
        }

        .content-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 2rem;
        }

        .card {
            background: white;
            border-radius: 8px;
            padding: 2rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease;
        }

        .card:hover {
            transform: translateY(-5px);
        }

        .card h3 {
            color: #2c3e50;
            margin-bottom: 1rem;
        }

        /* Footer */
        footer {
            background: #34495e;
            color: white;
            text-align: center;
            padding: 2rem 0;
            margin-top: 3rem;
        }

        /* Responsive */
        @media (max-width: 768px) {
            header h1 {
                font-size: 2rem;
            }

            nav ul {
                flex-direction: column;
                gap: 1rem;
            }

            .content-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <!-- Navigation -->
    <nav>
        <div class="container">
            <ul>
                <li><a href="#home">Home</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#services">Services</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </div>
    </nav>

    <!-- Header -->
    <header id="home">
        <div class="container">
            <h1>Welcome to Our Website</h1>
            <p>Creating beautiful and functional web experiences</p>
        </div>
    </header>

    <!-- Main Content -->
    <main>
        <div class="container">
            <section id="about">
                <h2>About Us</h2>
                <p>We are passionate about creating exceptional web experiences that combine beautiful design with powerful functionality. Our team brings together creativity and technical expertise to deliver solutions that exceed expectations.</p>

                <div class="content-grid">
                    <div class="card">
                        <h3>🎨 Design Excellence</h3>
                        <p>We create visually stunning interfaces that captivate users and enhance brand identity through thoughtful design principles and modern aesthetics.</p>
                    </div>
                    <div class="card">
                        <h3>⚡ Performance</h3>
                        <p>Our websites are optimized for speed and efficiency, ensuring fast loading times and smooth user interactions across all devices.</p>
                    </div>
                    <div class="card">
                        <h3>📱 Responsive</h3>
                        <p>Every project is built with mobile-first principles, providing optimal viewing experiences on smartphones, tablets, and desktops.</p>
                    </div>
                </div>
            </section>

            <section id="services">
                <h2>Our Services</h2>
                <div class="content-grid">
                    <div class="card">
                        <h3>Web Development</h3>
                        <p>Custom websites built with modern technologies and best practices for optimal performance and user experience.</p>
                    </div>
                    <div class="card">
                        <h3>UI/UX Design</h3>
                        <p>User-centered design solutions that prioritize usability while maintaining visual appeal and brand consistency.</p>
                    </div>
                    <div class="card">
                        <h3>E-commerce</h3>
                        <p>Complete online store solutions with secure payment processing and inventory management systems.</p>
                    </div>
                </div>
            </section>
        </div>
    </main>

    <!-- Footer -->
    <footer id="contact">
        <div class="container">
            <p>&copy; 2024 Our Website. All rights reserved.</p>
            <p>Contact us: info@ourwebsite.com | (555) 123-4567</p>
        </div>
    </footer>

    <script>
        // Smooth scrolling for navigation links
        document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Add scroll effect to navigation
        window.addEventListener('scroll', function() {
            const nav = document.querySelector('nav');
            if (window.scrollY > 100) {
                nav.style.background = 'rgba(44, 62, 80, 0.95)';
            } else {
                nav.style.background = '#2c3e50';
            }
        });
    </script>
</body>
</html>
</artifact>

This HTML page includes:
- **Semantic HTML structure** with proper navigation, header, main, and footer
- **Responsive CSS Grid layout** that adapts to different screen sizes
- **Smooth scrolling navigation** with JavaScript
- **Modern styling** with gradients, shadows, and hover effects
- **Mobile-first responsive design** with media queries
- **Accessibility features** like proper heading hierarchy and semantic markup

The page is fully self-contained with embedded CSS and JavaScript, ready to use immediately.`,
    expectedArtifacts: {
      count: 1,
      types: ['text/html'],
      identifiers: ['complete-html-page'],
      codePatterns: ['<!DOCTYPE html>', '<nav>', '<header>', '<main>', '<footer>', 'CSS Grid', 'JavaScript']
    }
  },

  {
    id: 'svelte-todo-explicit',
    scenario: 'User explicitly requests Svelte todo component',
    userPrompt: 'Create a Svelte todo list component with add, edit, delete, and filter functionality',
    aiResponse: `I'll create a comprehensive Svelte todo list component with all the features you requested:

<artifact identifier="svelte-todo-component" type="application/vnd.svelte+ts" title="Advanced Todo List Component">
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Type definitions
  interface Todo {
    id: string;
    text: string;
    completed: boolean;
    createdAt: Date;
    updatedAt: Date;
  }

  type FilterType = 'all' | 'active' | 'completed';

  // Component props
  export let initialTodos: Todo[] = [];

  // State
  let todos: Todo[] = initialTodos;
  let newTodoText = '';
  let editingId: string | null = null;
  let editingText = '';
  let filter: FilterType = 'all';

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    todosChanged: Todo[];
    todoAdded: Todo;
    todoUpdated: Todo;
    todoDeleted: string;
  }>();

  // Computed values
  $: filteredTodos = todos.filter(todo => {
    switch (filter) {
      case 'active': return !todo.completed;
      case 'completed': return todo.completed;
      default: return true;
    }
  });

  $: activeTodoCount = todos.filter(todo => !todo.completed).length;
  $: completedTodoCount = todos.filter(todo => todo.completed).length;

  // Helper functions
  function generateId(): string {
    return \`todo-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
  }

  function addTodo() {
    if (newTodoText.trim()) {
      const newTodo: Todo = {
        id: generateId(),
        text: newTodoText.trim(),
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      todos = [...todos, newTodo];
      newTodoText = '';

      dispatch('todoAdded', newTodo);
      dispatch('todosChanged', todos);
    }
  }

  function toggleTodo(id: string) {
    todos = todos.map(todo => {
      if (todo.id === id) {
        const updatedTodo = {
          ...todo,
          completed: !todo.completed,
          updatedAt: new Date()
        };
        dispatch('todoUpdated', updatedTodo);
        return updatedTodo;
      }
      return todo;
    });
    dispatch('todosChanged', todos);
  }

  function startEditing(todo: Todo) {
    editingId = todo.id;
    editingText = todo.text;
  }

  function saveEdit() {
    if (editingId && editingText.trim()) {
      todos = todos.map(todo => {
        if (todo.id === editingId) {
          const updatedTodo = {
            ...todo,
            text: editingText.trim(),
            updatedAt: new Date()
          };
          dispatch('todoUpdated', updatedTodo);
          return updatedTodo;
        }
        return todo;
      });

      editingId = null;
      editingText = '';
      dispatch('todosChanged', todos);
    }
  }

  function cancelEdit() {
    editingId = null;
    editingText = '';
  }

  function deleteTodo(id: string) {
    todos = todos.filter(todo => todo.id !== id);
    dispatch('todoDeleted', id);
    dispatch('todosChanged', todos);
  }

  function clearCompleted() {
    const completedIds = todos.filter(todo => todo.completed).map(todo => todo.id);
    todos = todos.filter(todo => !todo.completed);

    completedIds.forEach(id => dispatch('todoDeleted', id));
    dispatch('todosChanged', todos);
  }

  function handleKeydown(event: KeyboardEvent, action: string, ...args: any[]) {
    if (event.key === 'Enter') {
      event.preventDefault();
      switch (action) {
        case 'add':
          addTodo();
          break;
        case 'save':
          saveEdit();
          break;
      }
    } else if (event.key === 'Escape' && action === 'cancel') {
      cancelEdit();
    }
  }
</script>

<div class="todo-app">
  <header class="todo-header">
    <h1>📝 Todo List</h1>
    <div class="stats">
      <span class="stat">
        <span class="count">{activeTodoCount}</span>
        <span class="label">active</span>
      </span>
      <span class="stat">
        <span class="count">{completedTodoCount}</span>
        <span class="label">completed</span>
      </span>
      <span class="stat">
        <span class="count">{todos.length}</span>
        <span class="label">total</span>
      </span>
    </div>
  </header>

  <!-- Add new todo -->
  <div class="add-todo">
    <input
      type="text"
      bind:value={newTodoText}
      placeholder="What needs to be done?"
      class="todo-input"
      on:keydown={(e) => handleKeydown(e, 'add')}
    />
    <button
      on:click={addTodo}
      disabled={!newTodoText.trim()}
      class="add-button"
    >
      Add Todo
    </button>
  </div>

  <!-- Filter buttons -->
  <div class="filters">
    <button
      class="filter-button"
      class:active={filter === 'all'}
      on:click={() => filter = 'all'}
    >
      All ({todos.length})
    </button>
    <button
      class="filter-button"
      class:active={filter === 'active'}
      on:click={() => filter = 'active'}
    >
      Active ({activeTodoCount})
    </button>
    <button
      class="filter-button"
      class:active={filter === 'completed'}
      on:click={() => filter = 'completed'}
    >
      Completed ({completedTodoCount})
    </button>
  </div>

  <!-- Todo list -->
  <ul class="todo-list">
    {#each filteredTodos as todo (todo.id)}
      <li class="todo-item" class:completed={todo.completed}>
        <div class="todo-content">
          <input
            type="checkbox"
            checked={todo.completed}
            on:change={() => toggleTodo(todo.id)}
            class="todo-checkbox"
          />

          {#if editingId === todo.id}
            <input
              type="text"
              bind:value={editingText}
              class="edit-input"
              on:keydown={(e) => handleKeydown(e, 'save')}
              on:blur={saveEdit}
              use:focus
            />
            <div class="edit-actions">
              <button on:click={saveEdit} class="save-button">Save</button>
              <button on:click={cancelEdit} class="cancel-button">Cancel</button>
            </div>
          {:else}
            <span class="todo-text" on:dblclick={() => startEditing(todo)}>
              {todo.text}
            </span>
            <div class="todo-actions">
              <button on:click={() => startEditing(todo)} class="edit-button">
                ✏️
              </button>
              <button on:click={() => deleteTodo(todo.id)} class="delete-button">
                🗑️
              </button>
            </div>
          {/if}
        </div>

        <div class="todo-meta">
          <small>Created: {todo.createdAt.toLocaleDateString()}</small>
          {#if todo.updatedAt.getTime() !== todo.createdAt.getTime()}
            <small>Updated: {todo.updatedAt.toLocaleDateString()}</small>
          {/if}
        </div>
      </li>
    {:else}
      <li class="empty-state">
        {#if filter === 'all'}
          No todos yet. Add one above! 👆
        {:else if filter === 'active'}
          No active todos. Great job! 🎉
        {:else}
          No completed todos yet. Keep going! 💪
        {/if}
      </li>
    {/each}
  </ul>

  <!-- Actions -->
  {#if completedTodoCount > 0}
    <div class="todo-actions-bar">
      <button on:click={clearCompleted} class="clear-completed">
        Clear {completedTodoCount} completed
      </button>
    </div>
  {/if}
</div>

<style>
  .todo-app {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .todo-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .todo-header h1 {
    color: #2c3e50;
    margin-bottom: 1rem;
    font-size: 2.5rem;
  }

  .stats {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin-bottom: 1rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .count {
    font-size: 1.5rem;
    font-weight: bold;
    color: #3498db;
  }

  .label {
    font-size: 0.9rem;
    color: #7f8c8d;
    text-transform: uppercase;
  }

  .add-todo {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .todo-input, .edit-input {
    flex: 1;
    padding: 1rem;
    border: 2px solid #ecf0f1;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.3s ease;
  }

  .todo-input:focus, .edit-input:focus {
    outline: none;
    border-color: #3498db;
  }

  .add-button {
    padding: 1rem 2rem;
    background: #3498db;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  .add-button:hover:not(:disabled) {
    background: #2980b9;
  }

  .add-button:disabled {
    background: #bdc3c7;
    cursor: not-allowed;
  }

  .filters {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 2rem;
  }

  .filter-button {
    padding: 0.5rem 1rem;
    border: 2px solid #ecf0f1;
    background: white;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .filter-button.active {
    background: #3498db;
    color: white;
    border-color: #3498db;
  }

  .filter-button:hover:not(.active) {
    border-color: #3498db;
  }

  .todo-list {
    list-style: none;
    padding: 0;
  }

  .todo-item {
    background: white;
    border-radius: 8px;
    margin-bottom: 1rem;
    padding: 1rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
  }

  .todo-item:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .todo-item.completed {
    opacity: 0.7;
  }

  .todo-item.completed .todo-text {
    text-decoration: line-through;
    color: #7f8c8d;
  }

  .todo-content {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .todo-checkbox {
    width: 1.2rem;
    height: 1.2rem;
    cursor: pointer;
  }

  .todo-text {
    flex: 1;
    font-size: 1rem;
    cursor: pointer;
  }

  .todo-text:hover {
    color: #3498db;
  }

  .todo-actions, .edit-actions {
    display: flex;
    gap: 0.5rem;
  }

  .edit-button, .delete-button, .save-button, .cancel-button {
    padding: 0.25rem 0.5rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .edit-button, .save-button {
    background: #f39c12;
    color: white;
  }

  .delete-button, .cancel-button {
    background: #e74c3c;
    color: white;
  }

  .todo-meta {
    margin-top: 0.5rem;
    color: #7f8c8d;
    font-size: 0.8rem;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: #7f8c8d;
    font-style: italic;
    font-size: 1.1rem;
  }

  .todo-actions-bar {
    text-align: center;
    margin-top: 2rem;
  }

  .clear-completed {
    padding: 0.75rem 1.5rem;
    background: #e74c3c;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
  }

  .clear-completed:hover {
    background: #c0392b;
  }

  /* Focus directive */
  :global(.edit-input) {
    background: #fff9c4;
  }
</style>

<!-- Focus action -->
<script context="module" lang="ts">
  export function focus(node: HTMLElement) {
    node.focus();
    return {
      destroy() {
        // Cleanup if needed
      }
    };
  }
</script>`,
    expectedArtifacts: {
      count: 1,
      types: ['application/vnd.svelte+ts'],
      identifiers: ['svelte-todo-component'],
      codePatterns: ['<script lang="ts">', 'interface Todo', 'createEventDispatcher', 'bind:value', '{#each}', '{:else}']
    }
  }
];

export const IMPLICIT_CREATION_RESPONSES: TestArtifactResponse[] = [
  {
    id: 'react-code-fix-implicit',
    scenario: 'User asks to fix React code, AI responds with improved artifact',
    userPrompt: 'This React counter is not working properly, can you fix it?',
    aiResponse: `I can see the issue with your counter component. The problem is that you're not using React state to manage the counter value, so the UI doesn't update when you try to change it. Here's the corrected version:

<artifact identifier="fixed-react-counter" type="application/vnd.react+tsx" title="Fixed Counter Component">
import React, { useState } from 'react';

// Fixed version of your counter component
export default function Counter() {
  // Added useState hook to manage state
  const [count, setCount] = useState(0);

  // Functions to handle button clicks
  const increment = () => {
    setCount(prevCount => prevCount + 1);
  };

  const decrement = () => {
    setCount(prevCount => prevCount - 1);
  };

  const reset = () => {
    setCount(0);
  };

  return (
    <div style={{
      textAlign: 'center',
      padding: '2rem',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>Counter: {count}</h2>
      <div style={{ marginTop: '1rem' }}>
        <button
          onClick={decrement}
          style={{
            padding: '0.5rem 1rem',
            margin: '0 0.5rem',
            fontSize: '1rem',
            backgroundColor: '#ff6b6b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          -1
        </button>
        <button
          onClick={reset}
          style={{
            padding: '0.5rem 1rem',
            margin: '0 0.5rem',
            fontSize: '1rem',
            backgroundColor: '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
        <button
          onClick={increment}
          style={{
            padding: '0.5rem 1rem',
            margin: '0 0.5rem',
            fontSize: '1rem',
            backgroundColor: '#51cf66',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          +1
        </button>
      </div>
    </div>
  );
}
</artifact>

The key changes I made:

1. **Added useState hook**: \`const [count, setCount] = useState(0)\` to manage the counter state
2. **Proper state updates**: Used \`setCount\` with functional updates \`prevCount => prevCount + 1\` for safe state mutations
3. **Event handlers**: Created proper \`onClick\` handlers for each button
4. **UI improvements**: Added inline styles for better visual appearance

Now the counter will properly update the displayed value when you click the buttons. The state is managed by React, so the component will re-render whenever the count changes.`,
    expectedArtifacts: {
      count: 1,
      types: ['application/vnd.react+tsx'],
      identifiers: ['fixed-react-counter'],
      codePatterns: ['useState', 'setCount', 'onClick', 'prevCount =>']
    }
  },

  {
    id: 'form-validation-implicit',
    scenario: 'User asks about form validation, AI provides example artifact',
    userPrompt: 'What\'s the best way to handle form validation in React?',
    aiResponse: `Great question! Form validation is crucial for good user experience and data integrity. There are several approaches, but I'll show you a comprehensive example that demonstrates best practices:

<artifact identifier="react-form-validation-example" type="application/vnd.react+tsx" title="Complete Form Validation Example">
import React, { useState } from 'react';

// Type definitions for better TypeScript support
interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  age: string;
  terms: boolean;
}

interface FormErrors {
  [key: string]: string;
}

export default function ValidatedForm() {
  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    terms: false
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Validation rules
  const validateField = (name: string, value: any): string => {
    switch (name) {
      case 'name':
        if (!value || value.trim().length < 2) {
          return 'Name must be at least 2 characters long';
        }
        if (!/^[a-zA-Z\\s]+$/.test(value)) {
          return 'Name can only contain letters and spaces';
        }
        break;

      case 'email':
        if (!value) {
          return 'Email is required';
        }
        const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Please enter a valid email address';
        }
        break;

      case 'password':
        if (!value) {
          return 'Password is required';
        }
        if (value.length < 8) {
          return 'Password must be at least 8 characters long';
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/.test(value)) {
          return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
        }
        break;

      case 'confirmPassword':
        if (!value) {
          return 'Please confirm your password';
        }
        if (value !== formData.password) {
          return 'Passwords do not match';
        }
        break;

      case 'age':
        if (!value) {
          return 'Age is required';
        }
        const ageNum = parseInt(value);
        if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
          return 'Age must be between 13 and 120';
        }
        break;

      case 'terms':
        if (!value) {
          return 'You must accept the terms and conditions';
        }
        break;

      default:
        break;
    }
    return '';
  };

  // Real-time validation
  const handleInputChange = (name: string, value: any) => {
    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Validate field in real-time
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));

    // Special case: re-validate confirm password when password changes
    if (name === 'password' && formData.confirmPassword) {
      const confirmError = validateField('confirmPassword', formData.confirmPassword);
      setErrors(prev => ({
        ...prev,
        confirmPassword: confirmError
      }));
    }

    // Clear success message when user starts editing
    if (submitSuccess) {
      setSubmitSuccess(false);
    }
  };

  // Validate entire form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key as keyof FormData]);
      if (error) {
        newErrors[key] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Success
      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        age: '',
        terms: false
      });
      setErrors({});
    } catch (error) {
      setErrors({ submit: 'Failed to submit form. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#333' }}>
        Registration Form
      </h2>

      {submitSuccess && (
        <div style={{
          background: '#d4edda',
          color: '#155724',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem',
          border: '1px solid #c3e6cb'
        }}>
          ✅ Form submitted successfully!
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Name Field */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: errors.name ? '2px solid #dc3545' : '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
            placeholder="Enter your full name"
          />
          {errors.name && (
            <div style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.name}
            </div>
          )}
        </div>

        {/* Email Field */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: errors.email ? '2px solid #dc3545' : '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
            placeholder="Enter your email address"
          />
          {errors.email && (
            <div style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.email}
            </div>
          )}
        </div>

        {/* Password Field */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Password *
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: errors.password ? '2px solid #dc3545' : '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
            placeholder="Enter a strong password"
          />
          {errors.password && (
            <div style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.password}
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Confirm Password *
          </label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: errors.confirmPassword ? '2px solid #dc3545' : '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
            placeholder="Confirm your password"
          />
          {errors.confirmPassword && (
            <div style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.confirmPassword}
            </div>
          )}
        </div>

        {/* Age Field */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Age *
          </label>
          <input
            type="number"
            value={formData.age}
            onChange={(e) => handleInputChange('age', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: errors.age ? '2px solid #dc3545' : '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
            placeholder="Enter your age"
            min="13"
            max="120"
          />
          {errors.age && (
            <div style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.age}
            </div>
          )}
        </div>

        {/* Terms Checkbox */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.terms}
              onChange={(e) => handleInputChange('terms', e.target.checked)}
              style={{ marginRight: '0.5rem' }}
            />
            <span>I accept the terms and conditions *</span>
          </label>
          {errors.terms && (
            <div style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.terms}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: isSubmitting ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.3s ease'
          }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Form'}
        </button>

        {errors.submit && (
          <div style={{
            color: '#dc3545',
            fontSize: '0.875rem',
            marginTop: '1rem',
            textAlign: 'center'
          }}>
            {errors.submit}
          </div>
        )}
      </form>

      {/* Form State Debug (remove in production) */}
      <details style={{ marginTop: '2rem', fontSize: '0.875rem' }}>
        <summary>Debug Info (Development Only)</summary>
        <pre style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
          {JSON.stringify({ formData, errors, isSubmitting, submitSuccess }, null, 2)}
        </pre>
      </details>
    </div>
  );
}
</artifact>

This example demonstrates several form validation best practices:

## Key Features:

1. **Real-time validation** - Fields are validated as the user types
2. **Comprehensive validation rules** - Each field has specific validation logic
3. **TypeScript support** - Proper typing for form data and errors
4. **Visual feedback** - Error states change field appearance
5. **Accessibility** - Proper labels and error messages
6. **Password confirmation** - Special handling for matching passwords
7. **Loading states** - Submit button shows loading during submission
8. **Success feedback** - Clear indication when form is submitted
9. **Error recovery** - Users can fix errors and resubmit

## Validation Strategies:

- **Client-side validation** for immediate feedback
- **Field-level validation** on blur/change events
- **Form-level validation** on submit
- **Custom validation functions** for complex rules
- **Cross-field validation** (password confirmation)

## Best Practices Implemented:

- Validate on both input change and form submit
- Show errors after user interaction, not immediately
- Use clear, helpful error messages
- Disable submit button during submission
- Reset form after successful submission
- Handle both individual field and form-level errors

This approach provides excellent user experience while ensuring data integrity!`,
    expectedArtifacts: {
      count: 1,
      types: ['application/vnd.react+tsx'],
      identifiers: ['react-form-validation-example'],
      codePatterns: ['useState', 'interface FormData', 'validateField', 'handleSubmit', 'FormErrors']
    }
  }
];

export const MULTIPLE_ARTIFACTS_RESPONSES: TestArtifactResponse[] = [
  {
    id: 'html-css-js-combo',
    scenario: 'User asks for complete web solution, AI provides HTML, CSS, and JS artifacts',
    userPrompt: 'Create a complete interactive photo gallery with HTML, CSS, and JavaScript',
    aiResponse: `I'll create a complete interactive photo gallery for you with separate HTML, CSS, and JavaScript files:

<artifact identifier="photo-gallery-html" type="text/html" title="Photo Gallery HTML Structure">
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive Photo Gallery</title>
    <link rel="stylesheet" href="gallery.css">
</head>
<body>
    <div class="gallery-container">
        <header>
            <h1>📸 Photo Gallery</h1>
            <p>Click on any image to view in full size</p>
        </header>

        <div class="gallery-filters">
            <button class="filter-btn active" data-filter="all">All Photos</button>
            <button class="filter-btn" data-filter="nature">Nature</button>
            <button class="filter-btn" data-filter="city">City</button>
            <button class="filter-btn" data-filter="people">People</button>
        </div>

        <div class="gallery-grid">
            <div class="gallery-item" data-category="nature">
                <img src="https://picsum.photos/400/300?random=1" alt="Nature Photo 1" loading="lazy">
                <div class="overlay">
                    <h3>Beautiful Landscape</h3>
                    <p>Mountain view at sunset</p>
                </div>
            </div>

            <div class="gallery-item" data-category="city">
                <img src="https://picsum.photos/400/300?random=2" alt="City Photo 1" loading="lazy">
                <div class="overlay">
                    <h3>Urban Architecture</h3>
                    <p>Modern city skyline</p>
                </div>
            </div>

            <div class="gallery-item" data-category="nature">
                <img src="https://picsum.photos/400/300?random=3" alt="Nature Photo 2" loading="lazy">
                <div class="overlay">
                    <h3>Forest Path</h3>
                    <p>Peaceful woodland trail</p>
                </div>
            </div>

            <div class="gallery-item" data-category="people">
                <img src="https://picsum.photos/400/300?random=4" alt="People Photo 1" loading="lazy">
                <div class="overlay">
                    <h3>Street Photography</h3>
                    <p>Candid moments in the city</p>
                </div>
            </div>

            <div class="gallery-item" data-category="city">
                <img src="https://picsum.photos/400/300?random=5" alt="City Photo 2" loading="lazy">
                <div class="overlay">
                    <h3>Night Lights</h3>
                    <p>City illuminated after dark</p>
                </div>
            </div>

            <div class="gallery-item" data-category="nature">
                <img src="https://picsum.photos/400/300?random=6" alt="Nature Photo 3" loading="lazy">
                <div class="overlay">
                    <h3>Ocean Waves</h3>
                    <p>Seascape at golden hour</p>
                </div>
            </div>

            <div class="gallery-item" data-category="people">
                <img src="https://picsum.photos/400/300?random=7" alt="People Photo 2" loading="lazy">
                <div class="overlay">
                    <h3>Portrait</h3>
                    <p>Natural light photography</p>
                </div>
            </div>

            <div class="gallery-item" data-category="city">
                <img src="https://picsum.photos/400/300?random=8" alt="City Photo 3" loading="lazy">
                <div class="overlay">
                    <h3>Urban Details</h3>
                    <p>Architectural patterns</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Lightbox Modal -->
    <div class="lightbox" id="lightbox">
        <div class="lightbox-content">
            <span class="close-btn">&times;</span>
            <img class="lightbox-image" id="lightbox-image" src="" alt="">
            <div class="lightbox-info">
                <h3 id="lightbox-title"></h3>
                <p id="lightbox-description"></p>
            </div>
            <div class="lightbox-nav">
                <button class="nav-btn prev-btn">&#8249;</button>
                <button class="nav-btn next-btn">&#8250;</button>
            </div>
        </div>
    </div>

    <script src="gallery.js"></script>
</body>
</html>
</artifact>

<artifact identifier="photo-gallery-css" type="text/css" title="Photo Gallery CSS Styles">
/* Reset and Base Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Arial', sans-serif;
    line-height: 1.6;
    color: #333;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

.gallery-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}

/* Header Styles */
header {
    text-align: center;
    margin-bottom: 3rem;
    color: white;
}

header h1 {
    font-size: 3rem;
    margin-bottom: 0.5rem;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

header p {
    font-size: 1.2rem;
    opacity: 0.9;
}

/* Filter Buttons */
.gallery-filters {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 3rem;
    flex-wrap: wrap;
}

.filter-btn {
    padding: 0.75rem 1.5rem;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 25px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 1rem;
    backdrop-filter: blur(10px);
}

.filter-btn:hover,
.filter-btn.active {
    background: rgba(255, 255, 255, 0.9);
    color: #333;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

/* Gallery Grid */
.gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
}

.gallery-item {
    position: relative;
    border-radius: 15px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    background: white;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.gallery-item:hover {
    transform: translateY(-10px) scale(1.02);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.gallery-item img {
    width: 100%;
    height: 250px;
    object-fit: cover;
    transition: transform 0.3s ease;
}

.gallery-item:hover img {
    transform: scale(1.1);
}

/* Overlay */
.overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
    color: white;
    padding: 2rem 1.5rem 1.5rem;
    transform: translateY(100%);
    transition: transform 0.3s ease;
}

.gallery-item:hover .overlay {
    transform: translateY(0);
}

.overlay h3 {
    font-size: 1.2rem;
    margin-bottom: 0.5rem;
}

.overlay p {
    font-size: 0.9rem;
    opacity: 0.9;
}

/* Lightbox Styles */
.lightbox {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(5px);
}

.lightbox.active {
    display: flex;
    align-items: center;
    justify-content: center;
}

.lightbox-content {
    position: relative;
    max-width: 90%;
    max-height: 90%;
    background: white;
    border-radius: 15px;
    overflow: hidden;
    animation: lightboxFadeIn 0.3s ease;
}

@keyframes lightboxFadeIn {
    from {
        opacity: 0;
        transform: scale(0.8);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

.lightbox-image {
    width: 100%;
    height: auto;
    max-height: 60vh;
    object-fit: contain;
}

.lightbox-info {
    padding: 1.5rem;
    text-align: center;
}

.lightbox-info h3 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: #333;
}

.lightbox-info p {
    color: #666;
    font-size: 1rem;
}

/* Close Button */
.close-btn {
    position: absolute;
    top: 15px;
    right: 20px;
    font-size: 2rem;
    color: white;
    cursor: pointer;
    background: rgba(0, 0, 0, 0.5);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.3s ease;
    z-index: 1001;
}

.close-btn:hover {
    background: rgba(0, 0, 0, 0.8);
}

/* Navigation Buttons */
.lightbox-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 100%;
    display: flex;
    justify-content: space-between;
    padding: 0 20px;
    pointer-events: none;
}

.nav-btn {
    background: rgba(0, 0, 0, 0.5);
    color: white;
    border: none;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    font-size: 1.5rem;
    cursor: pointer;
    transition: background 0.3s ease;
    pointer-events: all;
    display: flex;
    align-items: center;
    justify-content: center;
}

.nav-btn:hover {
    background: rgba(0, 0, 0, 0.8);
}

/* Hide/Show Animation */
.gallery-item {
    opacity: 1;
    transition: opacity 0.3s ease, transform 0.3s ease;
}

.gallery-item.hidden {
    opacity: 0;
    transform: scale(0.8);
    pointer-events: none;
}

/* Responsive Design */
@media (max-width: 768px) {
    .gallery-container {
        padding: 1rem;
    }

    header h1 {
        font-size: 2rem;
    }

    .gallery-grid {
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
    }

    .gallery-filters {
        gap: 0.5rem;
    }

    .filter-btn {
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
    }

    .lightbox-content {
        max-width: 95%;
        max-height: 95%;
    }

    .nav-btn {
        width: 40px;
        height: 40px;
        font-size: 1.2rem;
    }
}

@media (max-width: 480px) {
    .gallery-grid {
        grid-template-columns: 1fr;
    }

    .gallery-filters {
        flex-direction: column;
        align-items: center;
    }
}

/* Loading Animation */
.gallery-item img {
    transition: opacity 0.3s ease;
}

.gallery-item img[loading] {
    opacity: 0.5;
}

.gallery-item img[loaded] {
    opacity: 1;
}

/* Focus Styles for Accessibility */
.filter-btn:focus,
.close-btn:focus,
.nav-btn:focus {
    outline: 3px solid #fff;
    outline-offset: 2px;
}

.gallery-item:focus {
    outline: 3px solid #fff;
    outline-offset: 5px;
}
</artifact>

<artifact identifier="photo-gallery-js" type="application/javascript" title="Photo Gallery JavaScript Functionality">
// Photo Gallery JavaScript
class PhotoGallery {
    constructor() {
        this.currentImageIndex = 0;
        this.filteredImages = [];
        this.allImages = [];
        this.lightbox = document.getElementById('lightbox');
        this.lightboxImage = document.getElementById('lightbox-image');
        this.lightboxTitle = document.getElementById('lightbox-title');
        this.lightboxDescription = document.getElementById('lightbox-description');

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadImages();
        this.setupLazyLoading();
        this.setupKeyboardNavigation();
    }

    setupEventListeners() {
        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleFilter(e.target.dataset.filter);
                this.updateActiveFilter(e.target);
            });
        });

        // Gallery items
        const galleryItems = document.querySelectorAll('.gallery-item');
        galleryItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                this.openLightbox(index);
            });

            // Add keyboard support
            item.setAttribute('tabindex', '0');
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.openLightbox(index);
                }
            });
        });

        // Lightbox controls
        document.querySelector('.close-btn').addEventListener('click', () => {
            this.closeLightbox();
        });

        document.querySelector('.prev-btn').addEventListener('click', () => {
            this.previousImage();
        });

        document.querySelector('.next-btn').addEventListener('click', () => {
            this.nextImage();
        });

        // Close lightbox when clicking outside
        this.lightbox.addEventListener('click', (e) => {
            if (e.target === this.lightbox) {
                this.closeLightbox();
            }
        });
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (this.lightbox.classList.contains('active')) {
                switch (e.key) {
                    case 'Escape':
                        this.closeLightbox();
                        break;
                    case 'ArrowLeft':
                        this.previousImage();
                        break;
                    case 'ArrowRight':
                        this.nextImage();
                        break;
                }
            }
        });
    }

    loadImages() {
        const galleryItems = document.querySelectorAll('.gallery-item');
        this.allImages = Array.from(galleryItems).map(item => ({
            element: item,
            img: item.querySelector('img'),
            title: item.querySelector('.overlay h3').textContent,
            description: item.querySelector('.overlay p').textContent,
            category: item.dataset.category
        }));

        this.filteredImages = [...this.allImages];
    }

    setupLazyLoading() {
        const images = document.querySelectorAll('.gallery-item img');

        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.src; // Trigger load
                        img.setAttribute('loaded', 'true');
                        observer.unobserve(img);
                    }
                });
            });

            images.forEach(img => {
                imageObserver.observe(img);
            });
        } else {
            // Fallback for browsers without IntersectionObserver
            images.forEach(img => {
                img.setAttribute('loaded', 'true');
            });
        }
    }

    handleFilter(filter) {
        const galleryItems = document.querySelectorAll('.gallery-item');

        // Animate out
        galleryItems.forEach(item => {
            item.classList.add('hidden');
        });

        // Wait for animation, then show filtered items
        setTimeout(() => {
            if (filter === 'all') {
                this.filteredImages = [...this.allImages];
                galleryItems.forEach(item => {
                    item.classList.remove('hidden');
                });
            } else {
                this.filteredImages = this.allImages.filter(img => img.category === filter);

                galleryItems.forEach(item => {
                    if (item.dataset.category === filter || filter === 'all') {
                        item.classList.remove('hidden');
                    }
                });
            }
        }, 150);
    }

    updateActiveFilter(activeButton) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        activeButton.classList.add('active');
    }

    openLightbox(index) {
        // Find the index in filtered images
        const clickedImage = document.querySelectorAll('.gallery-item:not(.hidden)')[index];
        const imageData = this.allImages.find(img => img.element === clickedImage);

        if (!imageData) return;

        this.currentImageIndex = this.filteredImages.indexOf(imageData);

        this.lightboxImage.src = imageData.img.src;
        this.lightboxImage.alt = imageData.img.alt;
        this.lightboxTitle.textContent = imageData.title;
        this.lightboxDescription.textContent = imageData.description;

        this.lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling

        // Focus management for accessibility
        this.lightbox.focus();
    }

    closeLightbox() {
        this.lightbox.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling

        // Return focus to the gallery item that was clicked
        const currentItem = this.filteredImages[this.currentImageIndex]?.element;
        if (currentItem) {
            currentItem.focus();
        }
    }

    previousImage() {
        this.currentImageIndex = (this.currentImageIndex - 1 + this.filteredImages.length) % this.filteredImages.length;
        this.updateLightboxImage();
    }

    nextImage() {
        this.currentImageIndex = (this.currentImageIndex + 1) % this.filteredImages.length;
        this.updateLightboxImage();
    }

    updateLightboxImage() {
        const imageData = this.filteredImages[this.currentImageIndex];

        // Add fade transition
        this.lightboxImage.style.opacity = '0';

        setTimeout(() => {
            this.lightboxImage.src = imageData.img.src;
            this.lightboxImage.alt = imageData.img.alt;
            this.lightboxTitle.textContent = imageData.title;
            this.lightboxDescription.textContent = imageData.description;
            this.lightboxImage.style.opacity = '1';
        }, 150);
    }

    // Public method to add new images dynamically
    addImage(imageSrc, title, description, category) {
        const galleryGrid = document.querySelector('.gallery-grid');

        const galleryItem = document.createElement('div');
        galleryItem.classList.add('gallery-item');
        galleryItem.dataset.category = category;

        galleryItem.innerHTML = \`
            <img src="\${imageSrc}" alt="\${title}" loading="lazy">
            <div class="overlay">
                <h3>\${title}</h3>
                <p>\${description}</p>
            </div>
        \`;

        galleryGrid.appendChild(galleryItem);

        // Add event listeners to new item
        const index = this.allImages.length;
        galleryItem.addEventListener('click', () => {
            this.openLightbox(index);
        });

        // Update images array
        this.allImages.push({
            element: galleryItem,
            img: galleryItem.querySelector('img'),
            title: title,
            description: description,
            category: category
        });

        // Refresh filtered images if needed
        this.loadImages();
    }

    // Public method to remove images
    removeImage(index) {
        if (index >= 0 && index < this.allImages.length) {
            this.allImages[index].element.remove();
            this.allImages.splice(index, 1);
            this.loadImages();
        }
    }

    // Performance monitoring
    getPerformanceStats() {
        return {
            totalImages: this.allImages.length,
            filteredImages: this.filteredImages.length,
            currentIndex: this.currentImageIndex,
            lightboxActive: this.lightbox.classList.contains('active')
        };
    }
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create global gallery instance
    window.photoGallery = new PhotoGallery();

    // Add some enhancement features
    addImageLoadingEffects();
    addTouchGestures();
    addPerformanceOptimizations();
});

// Additional enhancement functions
function addImageLoadingEffects() {
    const images = document.querySelectorAll('.gallery-item img');

    images.forEach(img => {
        img.addEventListener('load', function() {
            this.style.transition = 'opacity 0.3s ease';
            this.style.opacity = '1';
        });

        img.addEventListener('error', function() {
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4=';
            this.alt = 'Image failed to load';
        });
    });
}

function addTouchGestures() {
    let touchStartX = null;
    let touchStartY = null;

    document.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });

    document.addEventListener('touchend', e => {
        if (!touchStartX || !touchStartY) return;

        let touchEndX = e.changedTouches[0].clientX;
        let touchEndY = e.changedTouches[0].clientY;

        let diffX = touchStartX - touchEndX;
        let diffY = touchStartY - touchEndY;

        // Only trigger if horizontal swipe is greater than vertical
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            if (window.photoGallery.lightbox.classList.contains('active')) {
                if (diffX > 0) {
                    // Swipe left - next image
                    window.photoGallery.nextImage();
                } else {
                    // Swipe right - previous image
                    window.photoGallery.previousImage();
                }
            }
        }

        touchStartX = null;
        touchStartY = null;
    });
}

function addPerformanceOptimizations() {
    // Preload adjacent images in lightbox
    const preloadAdjacentImages = (currentIndex, images) => {
        const preloadIndices = [
            (currentIndex - 1 + images.length) % images.length,
            (currentIndex + 1) % images.length
        ];

        preloadIndices.forEach(index => {
            const img = new Image();
            img.src = images[index].img.src;
        });
    };

    // Debounce filter operations
    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    // Add to gallery instance
    if (window.photoGallery) {
        window.photoGallery.preloadAdjacentImages = preloadAdjacentImages;
        window.photoGallery.debounce = debounce;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PhotoGallery;
}
</artifact>

This complete photo gallery solution includes:

## HTML Features:
- **Semantic structure** with proper accessibility
- **Responsive grid layout** for different screen sizes
- **Filter categories** for organizing photos
- **Lightbox modal** for full-size viewing
- **Lazy loading** attributes for performance

## CSS Features:
- **Modern design** with gradients and animations
- **Responsive grid** that adapts to screen size
- **Hover effects** and smooth transitions
- **Backdrop blur** effects for modern browsers
- **Focus styles** for keyboard accessibility
- **Loading states** and visual feedback

## JavaScript Features:
- **Class-based architecture** for maintainability
- **Keyboard navigation** support (arrow keys, escape)
- **Touch gestures** for mobile devices
- **Lazy loading** with Intersection Observer
- **Filter functionality** with smooth animations
- **Lightbox navigation** between images
- **Performance optimizations** and error handling
- **Accessibility features** (focus management, ARIA labels)

## Key Functionality:
1. **Image filtering** by category (All, Nature, City, People)
2. **Lightbox viewing** with navigation controls
3. **Keyboard shortcuts** (arrows, escape)
4. **Touch/swipe support** for mobile
5. **Lazy loading** for better performance
6. **Error handling** for failed image loads
7. **Dynamic image addition/removal** methods
8. **Performance monitoring** capabilities

The gallery is fully responsive, accessible, and optimized for performance across all devices!`,
    expectedArtifacts: {
      count: 3,
      types: ['text/html', 'text/css', 'application/javascript'],
      identifiers: ['photo-gallery-html', 'photo-gallery-css', 'photo-gallery-js'],
      codePatterns: ['<!DOCTYPE html>', '.gallery-grid', 'class PhotoGallery', 'addEventListener', 'IntersectionObserver']
    }
  }
];

// Export all test data
export const ALL_TEST_RESPONSES = [
  ...EXPLICIT_CREATION_RESPONSES,
  ...IMPLICIT_CREATION_RESPONSES,
  ...MULTIPLE_ARTIFACTS_RESPONSES
];

// Utility functions for tests
export function getResponseByScenario(scenario: string): TestArtifactResponse | undefined {
  return ALL_TEST_RESPONSES.find(response => response.scenario.includes(scenario));
}

export function getResponsesByType(type: string): TestArtifactResponse[] {
  return ALL_TEST_RESPONSES.filter(response => response.expectedArtifacts.types.includes(type));
}

export function generateStreamingChunks(response: string, chunkSize: number = 50): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < response.length; i += chunkSize) {
    chunks.push(response.slice(i, i + chunkSize));
  }
  return chunks;
}