/**
 * Event Template Manager
 * Create and manage reusable event templates
 */

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Plus, Trash2, CheckCircle2, X, Loader } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function EventTemplateManager({ onTemplateSelect }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    event_type: 'casual',
    priority: 'STANDARD',
    tags: '',
  });

  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['eventTemplates'],
    queryFn: () => base44.entities.EventTemplate.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EventTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventTemplates'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EventTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventTemplates'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EventTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventTemplates'] });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', event_type: 'casual', priority: 'STANDARD', tags: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!formData.name) return;
    
    const data = {
      ...formData,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (template) => {
    setEditing(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      event_type: template.event_type || 'casual',
      priority: template.priority || 'STANDARD',
      tags: (template.tags || []).join(', '),
    });
    setShowForm(true);
  };

  const handleUseTemplate = (template) => {
    if (onTemplateSelect) {
      onTemplateSelect({
        name: template.name,
        description: template.description,
        event_type: template.event_type,
        priority: template.priority,
        tags: template.tags,
        template_id: template.id,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-5 h-5 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-bold uppercase text-white tracking-wide">Event Templates</h4>
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="bg-orange-600 hover:bg-orange-500">
          <Plus className="w-4 h-4 mr-1" />
          New Template
        </Button>
      </div>

      {showForm && (
        <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-lg p-4 space-y-3">
          <Input
            placeholder="Template Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="px-3 py-2"
          />
          <Textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="px-3 py-2 h-20"
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              value={formData.event_type}
              onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
            >
              <option value="casual">Casual</option>
              <option value="focused">Focused</option>
            </select>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
            >
              <option value="LOW">Low</option>
              <option value="STANDARD">Standard</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <Input
            placeholder="Tags (comma-separated)"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            className="px-3 py-2"
          />

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!formData.name} className="flex-1 bg-green-600 hover:bg-green-500">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button onClick={resetForm} variant="outline" className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {templates.length === 0 ? (
          <div className="p-6 text-center text-zinc-500 text-sm">
            No templates yet. Create one to get started.
          </div>
        ) : (
          templates.map((template) => (
            <div key={template.id} className="bg-zinc-900/30 border border-zinc-800/60 rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-white">{template.name}</h5>
                  {template.description && (
                    <p className="text-xs text-zinc-400 mt-1">{template.description}</p>
                  )}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="text-[10px] px-2 py-1 bg-blue-500/20 border border-blue-500/40 rounded text-blue-300">
                      {template.event_type}
                    </span>
                    <span className={`text-[10px] px-2 py-1 rounded ${
                      template.priority === 'CRITICAL' ? 'bg-red-500/20 border border-red-500/40 text-red-300' :
                      template.priority === 'HIGH' ? 'bg-orange-500/20 border border-orange-500/40 text-orange-300' :
                      'bg-yellow-500/20 border border-yellow-500/40 text-yellow-300'
                    }`}>
                      {template.priority}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleUseTemplate(template)} size="sm" variant="ghost">
                    <Copy className="w-4 h-4 text-green-400" />
                  </Button>
                  <Button onClick={() => handleEdit(template)} size="sm" variant="ghost">
                    ✏️
                  </Button>
                  <Button
                    onClick={() => deleteMutation.mutate(template.id)}
                    size="sm"
                    variant="ghost"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}