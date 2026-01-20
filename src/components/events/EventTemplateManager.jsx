import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Copy, Trash2, Plus } from 'lucide-react';

export default function EventTemplateManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    event_type: 'casual',
    priority: 'STANDARD',
    default_location: '',
    duration_minutes: 120,
    tags: []
  });

  const queryClient = useQueryClient();
  const { data: templates } = useQuery({
    queryKey: ['event-templates'],
    queryFn: () => base44.entities.EventTemplate.list(),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EventTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-templates'] });
      setFormData({ name: '', description: '', event_type: 'casual', priority: 'STANDARD', default_location: '', duration_minutes: 120, tags: [] });
      setIsOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EventTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event-templates'] })
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    createMutation.mutate(formData);
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-zinc-200">Event Templates</CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-zinc-800 hover:bg-zinc-700">
                <Plus className="w-3 h-3 mr-1" /> New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
              <DialogHeader>
                <DialogTitle>Create Event Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-zinc-400">Template Name</Label>
                  <Input
                    placeholder="e.g., Weekly Training"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div>
                  <Label className="text-xs text-zinc-400">Description</Label>
                  <Textarea
                    placeholder="Template description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 h-20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-zinc-400">Type</Label>
                    <Select value={formData.event_type} onValueChange={(val) => setFormData({ ...formData, event_type: val })}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="focused">Focused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-400">Priority</Label>
                    <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val })}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="STANDARD">Standard</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-zinc-400">Default Location</Label>
                  <Input
                    placeholder="e.g., Stanton"
                    value={formData.default_location}
                    onChange={(e) => setFormData({ ...formData, default_location: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div>
                  <Label className="text-xs text-zinc-400">Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full bg-red-600 hover:bg-red-700">
                  Create Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {templates.length === 0 ? (
          <p className="text-xs text-zinc-500">No templates created yet.</p>
        ) : (
          templates.map(template => (
            <div key={template.id} className="flex items-center justify-between p-2 bg-zinc-950/50 border border-zinc-800/50 rounded text-sm">
              <div>
                <div className="font-bold text-zinc-200">{template.name}</div>
                <div className="text-xs text-zinc-500">{template.event_type} • {template.duration_minutes}min</div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-8 h-8 text-zinc-500 hover:text-blue-400"
                  onClick={() => {
                    setFormData({
                      name: template.name + ' (Copy)',
                      description: template.description,
                      event_type: template.event_type,
                      priority: template.priority,
                      default_location: template.default_location,
                      duration_minutes: template.duration_minutes,
                      tags: template.tags || []
                    });
                    setIsOpen(true);
                  }}
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-8 h-8 text-zinc-500 hover:text-red-400"
                  onClick={() => deleteMutation.mutate(template.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}