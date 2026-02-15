import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/providers/AuthProvider';
import { Plus, User, Calendar, AlertCircle, CheckCircle2, Clock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

/**
 * TaskBoard - Kanban-style task management board for operations
 * Supports drag-and-drop, assignments, priorities, and dependencies
 */
export default function TaskBoard({ operationId }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filterAssigned, setFilterAssigned] = useState(false);

  const memberId = user?.member_profile_id || user?.id;

  const columns = [
    { id: 'todo', label: 'To Do', color: 'zinc' },
    { id: 'in_progress', label: 'In Progress', color: 'blue' },
    { id: 'review', label: 'Review', color: 'yellow' },
    { id: 'completed', label: 'Completed', color: 'green' },
    { id: 'blocked', label: 'Blocked', color: 'red' },
  ];

  const priorities = [
    { id: 'critical', label: 'Critical', color: 'red' },
    { id: 'high', label: 'High', color: 'orange' },
    { id: 'medium', label: 'Medium', color: 'yellow' },
    { id: 'low', label: 'Low', color: 'blue' },
  ];

  // Load tasks
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const filter = operationId ? { operation_id: operationId } : {};
        const allTasks = await base44.entities.Task.filter(filter);
        setTasks(allTasks);
      } catch (error) {
        console.error('Failed to load tasks:', error);
      }
    };

    loadTasks();
  }, [operationId]);

  // Real-time subscription
  useEffect(() => {
    const unsubscribe = base44.entities.Task.subscribe((event) => {
      if (event.type === 'create') {
        setTasks((prev) => [...prev, event.data]);
      } else if (event.type === 'update') {
        setTasks((prev) => prev.map((t) => (t.id === event.id ? event.data : t)));
      } else if (event.type === 'delete') {
        setTasks((prev) => prev.filter((t) => t.id !== event.id));
      }
    });

    return () => unsubscribe();
  }, []);

  const handleCreateTask = async (taskData) => {
    try {
      await base44.entities.Task.create({
        ...taskData,
        operation_id: operationId,
      });
      setCreateDialogOpen(false);
      toast.success('Task created');
    } catch (error) {
      toast.error('Failed to create task');
      console.error('Create task error:', error);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      await base44.entities.Task.update(taskId, updates);
      toast.success('Task updated');
    } catch (error) {
      toast.error('Failed to update task');
      console.error('Update task error:', error);
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    await handleUpdateTask(task.id, { status: newStatus });
  };

  const filteredTasks = filterAssigned
    ? tasks.filter((t) => t.assigned_to?.includes(memberId))
    : tasks;

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-200">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Task Board</h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={filterAssigned ? 'default' : 'outline'}
              onClick={() => setFilterAssigned(!filterAssigned)}
            >
              <User className="w-4 h-4 mr-2" />
              My Tasks
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Task
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <TaskForm onSubmit={handleCreateTask} onCancel={() => setCreateDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-5 gap-4 h-full">
          {columns.map((column) => {
            const columnTasks = filteredTasks.filter((t) => t.status === column.id);
            
            return (
              <div key={column.id} className="flex flex-col min-h-0">
                <div className="flex-shrink-0 mb-3 pb-2 border-b border-zinc-800">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                    {column.label}
                    <Badge variant="outline" className="ml-2">
                      {columnTasks.length}
                    </Badge>
                  </h3>
                </div>
                
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={(newStatus) => handleStatusChange(task, newStatus)}
                      onClick={() => setSelectedTask(task)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Detail Dialog */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedTask.title}</DialogTitle>
            </DialogHeader>
            <TaskDetail task={selectedTask} onUpdate={handleUpdateTask} onClose={() => setSelectedTask(null)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function TaskCard({ task, onStatusChange, onClick }) {
  const priorityColors = {
    critical: 'border-red-500 bg-red-500/10',
    high: 'border-orange-500 bg-orange-500/10',
    medium: 'border-yellow-500 bg-yellow-500/10',
    low: 'border-blue-500 bg-blue-500/10',
  };

  const completedCount = task.checklist?.filter((item) => item.completed).length || 0;
  const totalCount = task.checklist?.length || 0;

  return (
    <div
      className={`rounded border-l-4 ${priorityColors[task.priority]} bg-zinc-900/60 p-3 cursor-pointer hover:bg-zinc-800/60 transition-colors`}
      onClick={onClick}
    >
      <h4 className="text-sm font-semibold mb-2 text-zinc-200">{task.title}</h4>
      
      {task.description && (
        <p className="text-xs text-zinc-400 mb-2 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs">
          {task.priority}
        </Badge>
        
        {task.assigned_to?.length > 0 && (
          <Badge variant="outline" className="text-xs">
            <User className="w-3 h-3 mr-1" />
            {task.assigned_to.length}
          </Badge>
        )}

        {task.due_date && (
          <Badge variant="outline" className="text-xs">
            <Calendar className="w-3 h-3 mr-1" />
            {new Date(task.due_date).toLocaleDateString()}
          </Badge>
        )}

        {totalCount > 0 && (
          <Badge variant="outline" className="text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {completedCount}/{totalCount}
          </Badge>
        )}
      </div>
    </div>
  );
}

function TaskForm({ initialData, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(
    initialData || {
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      assigned_to: [],
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Task Title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />
      
      <Textarea
        placeholder="Task Description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        rows={3}
      />

      <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
        <SelectTrigger>
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create Task</Button>
      </div>
    </form>
  );
}

function TaskDetail({ task, onUpdate, onClose }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">{task.description}</p>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">Priority:</span>
          <Badge>{task.priority}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">Status:</span>
          <Badge>{task.status}</Badge>
        </div>
        {task.due_date && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">Due Date:</span>
            <span className="text-zinc-200">{new Date(task.due_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <Button onClick={onClose} className="w-full">
        Close
      </Button>
    </div>
  );
}