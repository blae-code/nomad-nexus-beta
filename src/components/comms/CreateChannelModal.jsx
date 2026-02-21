import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Hash, Volume2, Lock, Globe, Users } from 'lucide-react';

const CHANNEL_TEMPLATES = [
  { id: 'squad_voice', name: 'Squad Voice', type: 'voice', description: 'Voice channel for squad coordination', is_private: true },
  { id: 'briefing_room', name: 'Briefing Room', type: 'voice', description: 'Voice channel for operation briefings', is_private: false },
  { id: 'general_chat', name: 'General Chat', type: 'text', description: 'General text discussion', is_private: false },
  { id: 'intel_reports', name: 'Intel Reports', type: 'text', description: 'Tactical intelligence sharing', is_private: true },
  { id: 'custom', name: 'Custom', type: 'voice', description: '', is_private: false },
];

export default function CreateChannelModal({ open, onClose, categories = [], onSubmit }) {
  const [step, setStep] = useState(1);
  const [channelData, setChannelData] = useState({
    name: '',
    description: '',
    type: 'voice',
    category_id: '',
    is_private: false,
    is_public: true,
    max_members: 0,
    allowed_roles: [],
  });

  const handleTemplateSelect = (template) => {
    setChannelData({
      ...channelData,
      name: template.id !== 'custom' ? template.name : '',
      description: template.description,
      type: template.type,
      is_private: template.is_private,
      is_public: !template.is_private,
    });
    setStep(2);
  };

  const handleSubmit = () => {
    onSubmit?.(channelData);
    setChannelData({
      name: '',
      description: '',
      type: 'voice',
      category_id: '',
      is_private: false,
      is_public: true,
      max_members: 0,
      allowed_roles: [],
    });
    setStep(1);
    onClose?.();
  };

  const handleClose = () => {
    setStep(1);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-zinc-200">Create New Channel</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wide text-zinc-400">Choose Template</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {CHANNEL_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-zinc-700 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {template.type === 'voice' ? (
                        <Volume2 className="w-4 h-4 text-orange-400" />
                      ) : (
                        <Hash className="w-4 h-4 text-blue-400" />
                      )}
                      <span className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100">
                        {template.name}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 group-hover:text-zinc-400">
                      {template.description || 'Customizable channel'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wide text-zinc-400">Channel Type</Label>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setChannelData({ ...channelData, type: 'voice' })}
                  className={`flex-1 p-3 rounded-lg border transition-all ${
                    channelData.type === 'voice'
                      ? 'border-orange-500/60 bg-orange-950/40'
                      : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60'
                  }`}
                >
                  <Volume2 className={`w-5 h-5 mx-auto mb-1 ${
                    channelData.type === 'voice' ? 'text-orange-400' : 'text-zinc-500'
                  }`} />
                  <span className="block text-xs text-zinc-300">Voice</span>
                </button>
                <button
                  onClick={() => setChannelData({ ...channelData, type: 'text' })}
                  className={`flex-1 p-3 rounded-lg border transition-all ${
                    channelData.type === 'text'
                      ? 'border-blue-500/60 bg-blue-950/40'
                      : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60'
                  }`}
                >
                  <Hash className={`w-5 h-5 mx-auto mb-1 ${
                    channelData.type === 'text' ? 'text-blue-400' : 'text-zinc-500'
                  }`} />
                  <span className="block text-xs text-zinc-300">Text</span>
                </button>
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-zinc-400">Channel Name</Label>
              <Input
                value={channelData.name}
                onChange={(e) => setChannelData({ ...channelData, name: e.target.value })}
                placeholder="Enter channel name..."
                className="mt-2 bg-zinc-900/60 border-zinc-800 text-zinc-200"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-zinc-400">Description (Optional)</Label>
              <Textarea
                value={channelData.description}
                onChange={(e) => setChannelData({ ...channelData, description: e.target.value })}
                placeholder="Describe the channel's purpose..."
                className="mt-2 bg-zinc-900/60 border-zinc-800 text-zinc-200 h-20"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-zinc-400">Category</Label>
              <Select
                value={channelData.category_id}
                onValueChange={(value) => setChannelData({ ...channelData, category_id: value })}
              >
                <SelectTrigger className="mt-2 bg-zinc-900/60 border-zinc-800 text-zinc-200">
                  <SelectValue placeholder="Select a category..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-zinc-500" />
                  <Label className="text-xs text-zinc-300">Private</Label>
                </div>
                <Switch
                  checked={channelData.is_private}
                  onCheckedChange={(checked) => setChannelData({ ...channelData, is_private: checked, is_public: !checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/40">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-zinc-500" />
                  <Label className="text-xs text-zinc-300">Public</Label>
                </div>
                <Switch
                  checked={channelData.is_public}
                  onCheckedChange={(checked) => setChannelData({ ...channelData, is_public: checked, is_private: !checked })}
                />
              </div>
            </div>

            {channelData.type === 'voice' && (
              <div>
                <Label className="text-xs uppercase tracking-wide text-zinc-400">Max Members (0 = unlimited)</Label>
                <Input
                  type="number"
                  value={channelData.max_members}
                  onChange={(e) => setChannelData({ ...channelData, max_members: parseInt(e.target.value) || 0 })}
                  className="mt-2 bg-zinc-900/60 border-zinc-800 text-zinc-200"
                />
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-zinc-800">
              <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={!channelData.name} className="flex-1 bg-orange-600 hover:bg-orange-700">
                Create Channel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}