<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  const sample = {
    artifact: {
      type: "react",
      title: "Simple React Counter",
      dependencies: {},
      files: {
        "/App.tsx": `
import React, { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);
  
  return (
    <div style={{ 
      fontFamily: 'system-ui', 
      padding: '20px', 
      textAlign: 'center',
      maxWidth: '400px',
      margin: '0 auto'
    }}>
      <h1>React Counter</h1>
      <div style={{ 
        fontSize: '2rem', 
        margin: '20px 0',
        padding: '20px',
        backgroundColor: '#f0f0f0',
        borderRadius: '8px'
      }}>
        {count}
      </div>
      <div>
        <button 
          onClick={() => setCount(count - 1)}
          style={{
            margin: '0 10px',
            padding: '10px 20px',
            fontSize: '1rem',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#ff6b6b',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          -
        </button>
        <button 
          onClick={() => setCount(count + 1)}
          style={{
            margin: '0 10px',
            padding: '10px 20px',
            fontSize: '1rem',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#4ecdc4',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          +
        </button>
      </div>
      <p style={{ marginTop: '20px', color: '#666' }}>
        This is a simple React component rendered with Sandpack!
      </p>
    </div>
  );
}
        `.trim()
      }
    }
  };

  function insertSample() {
    dispatch('insert', JSON.stringify(sample, null, 2));
  }
</script>

<button 
  class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition" 
  on:click={insertSample}
>
  Insert Sample React Artifact
</button>
