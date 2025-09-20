<script lang="ts">
  // Sample Svelte artifacts for testing
  export const basicSvelteArtifact = `\`\`\`svelte
<script>
  let count = 0;
  
  function increment() {
    count += 1;
  }
</script>

<div style="padding: 20px; font-family: Arial, sans-serif;">
  <h1>Basic Svelte Counter</h1>
  <p>Count: {count}</p>
  <button 
    on:click={increment}
    style="
      padding: 10px 20px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    "
  >
    Increment
  </button>
</div>
\`\`\``;

  export const shadcnSvelteArtifact = `{
  "type": "svelte",
  "title": "Modern Task Manager with shadcn-svelte",
  "entryCode": "<script lang=\\"ts\\">\\n  import { Button } from '$lib/components/ui/button';\\n  import { Input } from '$lib/components/ui/input';\\n  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';\\n  import { Badge } from '$lib/components/ui/badge';\\n  import { Trash2, Plus, CheckCircle } from 'lucide-svelte';\\n\\n  interface Task {\\n    id: number;\\n    title: string;\\n    completed: boolean;\\n    priority: 'low' | 'medium' | 'high';\\n  }\\n\\n  let tasks: Task[] = [\\n    { id: 1, title: 'Design the UI mockup', completed: false, priority: 'high' },\\n    { id: 2, title: 'Implement authentication', completed: false, priority: 'medium' },\\n    { id: 3, title: 'Write unit tests', completed: true, priority: 'low' }\\n  ];\\n  let newTask = '';\\n  let selectedPriority: 'low' | 'medium' | 'high' = 'medium';\\n\\n  function addTask() {\\n    if (newTask.trim()) {\\n      tasks = [...tasks, {\\n        id: Date.now(),\\n        title: newTask,\\n        completed: false,\\n        priority: selectedPriority\\n      }];\\n      newTask = '';\\n    }\\n  }\\n\\n  function deleteTask(id: number) {\\n    tasks = tasks.filter(task => task.id !== id);\\n  }\\n\\n  function toggleTask(id: number) {\\n    tasks = tasks.map(task => \\n      task.id === id ? { ...task, completed: !task.completed } : task\\n    );\\n  }\\n\\n  function getPriorityColor(priority: string) {\\n    switch (priority) {\\n      case 'high': return 'bg-red-100 text-red-800';\\n      case 'medium': return 'bg-yellow-100 text-yellow-800';\\n      case 'low': return 'bg-green-100 text-green-800';\\n      default: return 'bg-gray-100 text-gray-800';\\n    }\\n  }\\n\\n  $: completedTasks = tasks.filter(task => task.completed).length;\\n  $: totalTasks = tasks.length;\\n</script>\\n\\n<div class=\\"min-h-screen bg-gray-50 p-8\\">\\n  <div class=\\"max-w-2xl mx-auto space-y-6\\">\\n    <Card>\\n      <CardHeader>\\n        <CardTitle class=\\"text-3xl font-bold text-center\\">\\n          Task Manager\\n        </CardTitle>\\n        <div class=\\"flex justify-center space-x-4 text-sm text-gray-600\\">\\n          <span>{completedTasks} completed</span>\\n          <span>•</span>\\n          <span>{totalTasks - completedTasks} remaining</span>\\n        </div>\\n      </CardHeader>\\n      <CardContent class=\\"space-y-4\\">\\n        <div class=\\"flex space-x-2\\">\\n          <Input\\n            placeholder=\\"Add a new task...\\"\\n            bind:value={newTask}\\n            on:keypress={(e) => e.key === 'Enter' && addTask()}\\n            class=\\"flex-1\\"\\n          />\\n          <select bind:value={selectedPriority} class=\\"px-3 py-2 border rounded-md\\">\\n            <option value=\\"low\\">Low</option>\\n            <option value=\\"medium\\">Medium</option>\\n            <option value=\\"high\\">High</option>\\n          </select>\\n          <Button on:click={addTask} size=\\"sm\\">\\n            <Plus class=\\"h-4 w-4\\" />\\n          </Button>\\n        </div>\\n        \\n        <div class=\\"space-y-2\\">\\n          {#each tasks as task (task.id)}\\n            <div\\n              class=\\"flex items-center justify-between p-4 rounded-lg border transition-colors {\\n                task.completed ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'\\n              }\\"\\n            >\\n              <div class=\\"flex items-center space-x-3 flex-1\\">\\n                <button\\n                  on:click={() => toggleTask(task.id)}\\n                  class=\\"text-gray-400 hover:text-green-500 transition-colors\\"\\n                >\\n                  <CheckCircle\\n                    class=\\"h-5 w-5 {task.completed ? 'text-green-500 fill-current' : ''}\\"\\n                  />\\n                </button>\\n                <span\\n                  class=\\"flex-1 {\\n                    task.completed ? 'line-through text-gray-500' : 'text-gray-900'\\n                  }\\"\\n                >\\n                  {task.title}\\n                </span>\\n                <Badge class=\\"{getPriorityColor(task.priority)} text-xs\\">\\n                  {task.priority}\\n                </Badge>\\n              </div>\\n              <Button\\n                variant=\\"ghost\\"\\n                size=\\"sm\\"\\n                on:click={() => deleteTask(task.id)}\\n                class=\\"text-red-500 hover:text-red-700 ml-2\\"\\n              >\\n                <Trash2 class=\\"h-4 w-4\\" />\\n              </Button>\\n            </div>\\n          {/each}\\n        </div>\\n        \\n        {#if tasks.length === 0}\\n          <div class=\\"text-center text-gray-500 py-8\\">\\n            No tasks yet. Add one above to get started!\\n          </div>\\n        {/if}\\n      </CardContent>\\n    </Card>\\n  </div>\\n</div>",
  "useShadcn": true,
  "dependencies": {
    "lucide-svelte": "^0.263.1"
  }
}`;

  export const pasteableSvelteJSON = JSON.stringify({
    type: "svelte",
    title: "Interactive Weather Dashboard",
    entryCode: `<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Progress } from '$lib/components/ui/progress';
  import { Badge } from '$lib/components/ui/badge';
  import { Cloud, Sun, CloudRain, Wind, Thermometer, Droplets } from 'lucide-svelte';
  import { onMount } from 'svelte';

  interface WeatherData {
    location: string;
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    uvIndex: number;
    icon: any;
  }

  let currentWeather: WeatherData = {
    location: "San Francisco, CA",
    temperature: 72,
    condition: "Partly Cloudy",
    humidity: 65,
    windSpeed: 8,
    uvIndex: 6,
    icon: Cloud
  };

  let forecast = [
    { day: "Today", high: 75, low: 65, condition: "Partly Cloudy", icon: Cloud },
    { day: "Tomorrow", high: 78, low: 68, condition: "Sunny", icon: Sun },
    { day: "Wednesday", high: 73, low: 63, condition: "Rainy", icon: CloudRain },
    { day: "Thursday", high: 76, low: 66, condition: "Sunny", icon: Sun },
    { day: "Friday", high: 74, low: 64, condition: "Cloudy", icon: Cloud }
  ];

  let animatedTemp = 0;

  onMount(() => {
    const interval = setInterval(() => {
      if (animatedTemp < currentWeather.temperature) {
        animatedTemp += 1;
      }
    }, 50);
    
    return () => clearInterval(interval);
  });

  function getUVColor(uvIndex: number) {
    if (uvIndex <= 2) return "text-green-500";
    if (uvIndex <= 5) return "text-yellow-500";
    if (uvIndex <= 7) return "text-orange-500";
    return "text-red-500";
  }

  function refreshWeather() {
    // Simulate weather refresh
    currentWeather.temperature = Math.floor(Math.random() * 20) + 65;
    currentWeather.humidity = Math.floor(Math.random() * 40) + 40;
    currentWeather.windSpeed = Math.floor(Math.random() * 15) + 3;
    animatedTemp = 0;
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
  <div class="max-w-6xl mx-auto space-y-8">
    <div class="flex items-center justify-between">
      <h1 class="text-4xl font-bold text-gray-900">Weather Dashboard</h1>
      <Button on:click={refreshWeather}>Refresh</Button>
    </div>

    <!-- Current Weather -->
    <Card class="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
      <CardContent class="p-8">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-semibold mb-2">{currentWeather.location}</h2>
            <div class="flex items-center space-x-4">
              <span class="text-6xl font-bold">{animatedTemp}°</span>
              <div>
                <p class="text-xl">{currentWeather.condition}</p>
                <p class="text-blue-100">Feels like {currentWeather.temperature + 2}°</p>
              </div>
            </div>
          </div>
          <svelte:component this={currentWeather.icon} class="h-24 w-24 text-white/80" />
        </div>
      </CardContent>
    </Card>

    <!-- Weather Details -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardContent class="flex items-center space-x-4 p-6">
          <Droplets class="h-8 w-8 text-blue-500" />
          <div>
            <p class="text-sm text-gray-600">Humidity</p>
            <p class="text-2xl font-semibold">{currentWeather.humidity}%</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="flex items-center space-x-4 p-6">
          <Wind class="h-8 w-8 text-green-500" />
          <div>
            <p class="text-sm text-gray-600">Wind Speed</p>
            <p class="text-2xl font-semibold">{currentWeather.windSpeed} mph</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="flex items-center space-x-4 p-6">
          <Sun class="h-8 w-8 {getUVColor(currentWeather.uvIndex)}" />
          <div>
            <p class="text-sm text-gray-600">UV Index</p>
            <p class="text-2xl font-semibold">{currentWeather.uvIndex}</p>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- 5-Day Forecast -->
    <Card>
      <CardHeader>
        <CardTitle>5-Day Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          {#each forecast as day}
            <div class="text-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <p class="font-semibold text-gray-900 mb-2">{day.day}</p>
              <svelte:component this={day.icon} class="h-8 w-8 mx-auto mb-2 text-gray-600" />
              <p class="text-sm text-gray-600 mb-1">{day.condition}</p>
              <div class="flex justify-center space-x-2 text-sm">
                <span class="font-semibold">{day.high}°</span>
                <span class="text-gray-500">{day.low}°</span>
              </div>
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>

    <!-- Weather Stats -->
    <Card>
      <CardHeader>
        <CardTitle>Weather Statistics</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div>
          <div class="flex justify-between text-sm mb-2">
            <span>Humidity Level</span>
            <span>{currentWeather.humidity}%</span>
          </div>
          <Progress value={currentWeather.humidity} class="w-full" />
        </div>
        
        <div>
          <div class="flex justify-between text-sm mb-2">
            <span>Wind Speed</span>
            <span>{currentWeather.windSpeed}/20 mph</span>
          </div>
          <Progress value={(currentWeather.windSpeed / 20) * 100} class="w-full" />
        </div>
        
        <div>
          <div class="flex justify-between text-sm mb-2">
            <span>UV Index</span>
            <span>{currentWeather.uvIndex}/10</span>
          </div>
          <Progress value={(currentWeather.uvIndex / 10) * 100} class="w-full" />
        </div>
      </CardContent>
    </Card>
  </div>
</div>`,
    useShadcn: true,
    dependencies: {
      "lucide-svelte": "^0.263.1"
    }
  }, null, 2);

  // Function to copy sample to clipboard
  export function copySample(sample: string) {
    navigator.clipboard.writeText(sample);
  }
</script>
