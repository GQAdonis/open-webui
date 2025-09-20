<script lang="ts">
  // Sample React artifacts for testing
  export const basicReactArtifact = `\`\`\`tsx
import React, { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Basic React Counter</h1>
      <p>Count: {count}</p>
      <button 
        onClick={() => setCount(count + 1)}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Increment
      </button>
    </div>
  );
}
\`\`\``;

  export const shadcnReactArtifact = `{
  "type": "react",
  "title": "Modern Todo App with shadcn/ui",
  "entryCode": "import React, { useState } from 'react';\\nimport { Button } from '@/components/ui/button';\\nimport { Input } from '@/components/ui/input';\\nimport { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';\\nimport { Trash2, Plus } from 'lucide-react';\\n\\ninterface Todo {\\n  id: number;\\n  text: string;\\n  completed: boolean;\\n}\\n\\nexport default function TodoApp() {\\n  const [todos, setTodos] = useState<Todo[]>([\\n    { id: 1, text: 'Learn React', completed: false },\\n    { id: 2, text: 'Build something awesome', completed: false }\\n  ]);\\n  const [newTodo, setNewTodo] = useState('');\\n\\n  const addTodo = () => {\\n    if (newTodo.trim()) {\\n      setTodos([...todos, {\\n        id: Date.now(),\\n        text: newTodo,\\n        completed: false\\n      }]);\\n      setNewTodo('');\\n    }\\n  };\\n\\n  const deleteTodo = (id: number) => {\\n    setTodos(todos.filter(todo => todo.id !== id));\\n  };\\n\\n  const toggleTodo = (id: number) => {\\n    setTodos(todos.map(todo => \\n      todo.id === id ? { ...todo, completed: !todo.completed } : todo\\n    ));\\n  };\\n\\n  return (\\n    <div className=\\"min-h-screen bg-gray-50 p-8\\">\\n      <Card className=\\"max-w-md mx-auto\\">\\n        <CardHeader>\\n          <CardTitle className=\\"text-2xl font-bold text-center\\">\\n            Todo App\\n          </CardTitle>\\n        </CardHeader>\\n        <CardContent className=\\"space-y-4\\">\\n          <div className=\\"flex space-x-2\\">\\n            <Input\\n              placeholder=\\"Add a new todo...\\"\\n              value={newTodo}\\n              onChange={(e) => setNewTodo(e.target.value)}\\n              onKeyPress={(e) => e.key === 'Enter' && addTodo()}\\n            />\\n            <Button onClick={addTodo} size=\\"sm\\">\\n              <Plus className=\\"h-4 w-4\\" />\\n            </Button>\\n          </div>\\n          \\n          <div className=\\"space-y-2\\">\\n            {todos.map((todo) => (\\n              <div\\n                key={todo.id}\\n                className={\`flex items-center justify-between p-3 rounded-lg border \${\\n                  todo.completed ? 'bg-gray-50 text-gray-500' : 'bg-white'\\n                }\`}\\n              >\\n                <div\\n                  className=\\"flex items-center space-x-2 cursor-pointer flex-1\\"\\n                  onClick={() => toggleTodo(todo.id)}\\n                >\\n                  <input\\n                    type=\\"checkbox\\"\\n                    checked={todo.completed}\\n                    onChange={() => toggleTodo(todo.id)}\\n                    className=\\"rounded\\"\\n                  />\\n                  <span\\n                    className={\`\${\\n                      todo.completed ? 'line-through text-gray-500' : ''\\n                    }\`}\\n                  >\\n                    {todo.text}\\n                  </span>\\n                </div>\\n                <Button\\n                  variant=\\"ghost\\"\\n                  size=\\"sm\\"\\n                  onClick={() => deleteTodo(todo.id)}\\n                  className=\\"text-red-500 hover:text-red-700\\"\\n                >\\n                  <Trash2 className=\\"h-4 w-4\\" />\\n                </Button>\\n              </div>\\n            ))}\\n          </div>\\n          \\n          {todos.length === 0 && (\\n            <div className=\\"text-center text-gray-500 py-8\\">\\n              No todos yet. Add one above!\\n            </div>\\n          )}\\n        </CardContent>\\n      </Card>\\n    </div>\\n  );\\n}",
  "useShadcn": true,
  "dependencies": {
    "lucide-react": "^0.263.1"
  }
}`;

  export const pasteableReactJSON = JSON.stringify({
    type: "react",
    title: "Interactive Dashboard",
    entryCode: `import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';

interface MetricCard {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ReactNode;
}

export default function Dashboard() {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 1));
    }, 50);
    return () => clearInterval(timer);
  }, []);

  const metrics: MetricCard[] = [
    {
      title: 'Total Revenue',
      value: '$45,231',
      change: '+20.1%',
      trend: 'up',
      icon: <DollarSign className="h-4 w-4 text-green-500" />
    },
    {
      title: 'Active Users',
      value: '2,350',
      change: '+5.4%',
      trend: 'up',
      icon: <Users className="h-4 w-4 text-blue-500" />
    },
    {
      title: 'Growth Rate',
      value: '12.5%',
      change: '-2.1%',
      trend: 'down',
      icon: <TrendingUp className="h-4 w-4 text-orange-500" />
    },
    {
      title: 'Conversion',
      value: '3.2%',
      change: '+1.2%',
      trend: 'up',
      icon: <BarChart3 className="h-4 w-4 text-purple-500" />
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button>Export Data</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric) => (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {metric.title}
                </CardTitle>
                {metric.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <Badge 
                  variant={metric.trend === 'up' ? 'default' : 'secondary'}
                  className="mt-1"
                >
                  {metric.change} from last month
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Progress Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">156</div>
                <div className="text-sm text-gray-600">Completed Tasks</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">23</div>
                <div className="text-sm text-gray-600">Active Projects</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">8</div>
                <div className="text-sm text-gray-600">Team Members</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}`,
    useShadcn: true,
    dependencies: {
      "lucide-react": "^0.263.1"
    }
  }, null, 2);

  // Function to copy sample to clipboard
  export function copySample(sample: string) {
    navigator.clipboard.writeText(sample);
  }
</script>
