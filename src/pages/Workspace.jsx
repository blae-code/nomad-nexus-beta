import React, { useState, useEffect, useMemo } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Layout, Save, Plus, Settings, Monitor, User } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { WIDGET_REGISTRY } from '@/components/workspace/WidgetRegistry';
import { WORKSPACE_PRESETS, getPresetForRole } from '@/components/workspace/WorkspacePresets';
import { base44 } from '@/api/base44Client';

const ResponsiveGridLayout = WidthProvider(Responsive);

const STORAGE_KEY = 'nexus.workspace.layout';
const PRESET_KEY = 'nexus.workspace.activePreset';

export default function Workspace() {
  const { user } = useAuth();
  const [layouts, setLayouts] = useState({ lg: [], md: [], sm: [] });
  const [activeWidgets, setActiveWidgets] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');

  // Load saved layout or apply role-based preset
  useEffect(() => {
    const savedLayoutJson = localStorage.getItem(STORAGE_KEY);
    const savedPreset = localStorage.getItem(PRESET_KEY);

    if (savedLayoutJson) {
      try {
        const parsed = JSON.parse(savedLayoutJson);
        setLayouts(parsed.layouts || { lg: [], md: [], sm: [] });
        setActiveWidgets(parsed.widgets || []);
        setActivePreset(savedPreset || 'custom');
        return;
      } catch (e) {
        console.warn('[Workspace] Failed to parse saved layout:', e);
      }
    }

    // Apply role-based default preset
    const userRole = user?.member_profile_data?.roles?.[0] || 'member';
    const defaultPreset = getPresetForRole(userRole);
    if (defaultPreset) {
      applyPreset(defaultPreset);
    }
  }, [user]);

  const applyPreset = (preset) => {
    setLayouts(preset.layouts);
    setActiveWidgets(preset.widgets);
    setActivePreset(preset.id);
    localStorage.setItem(PRESET_KEY, preset.id);
    saveLayout(preset.layouts, preset.widgets);
  };

  const saveLayout = (layoutData, widgetData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      layouts: layoutData,
      widgets: widgetData,
      savedAt: new Date().toISOString(),
    }));
  };

  const handleLayoutChange = (currentLayout, allLayouts) => {
    setLayouts(allLayouts);
    saveLayout(allLayouts, activeWidgets);
  };

  const addWidget = (widgetType) => {
    const widgetDef = WIDGET_REGISTRY[widgetType];
    if (!widgetDef) return;

    const newWidget = {
      id: `${widgetType}-${Date.now()}`,
      type: widgetType,
      config: {},
    };

    const newLayout = {
      i: newWidget.id,
      x: 0,
      y: Infinity,
      w: widgetDef.defaultSize.w,
      h: widgetDef.defaultSize.h,
      minW: widgetDef.minSize.w,
      minH: widgetDef.minSize.h,
    };

    setActiveWidgets([...activeWidgets, newWidget]);
    setLayouts({
      lg: [...layouts.lg, newLayout],
      md: [...layouts.md, { ...newLayout, w: Math.min(newLayout.w, 6) }],
      sm: [...layouts.sm, { ...newLayout, w: 12 }],
    });
    setShowAddWidget(false);
  };

  const removeWidget = (widgetId) => {
    setActiveWidgets(activeWidgets.filter((w) => w.id !== widgetId));
    setLayouts({
      lg: layouts.lg.filter((l) => l.i !== widgetId),
      md: layouts.md.filter((l) => l.i !== widgetId),
      sm: layouts.sm.filter((l) => l.i !== widgetId),
    });
  };

  const saveCustomPreset = async () => {
    if (!presetName.trim()) return;

    const customPreset = {
      id: `custom-${Date.now()}`,
      name: presetName,
      role: 'custom',
      layouts,
      widgets: activeWidgets,
    };

    try {
      await base44.entities.WorkspaceLayout.create({
        name: presetName,
        role: 'custom',
        layouts,
        widgets: activeWidgets,
        created_by: user?.id,
      });
      setShowSavePreset(false);
      setPresetName('');
      setActivePreset(customPreset.id);
    } catch (error) {
      console.error('[Workspace] Failed to save preset:', error);
    }
  };

  const availableWidgets = Object.entries(WIDGET_REGISTRY)
    .filter(([type]) => !activeWidgets.some((w) => w.type === type && WIDGET_REGISTRY[type].singleton))
    .map(([type, def]) => ({ type, ...def }));

  return (
    <div className="h-full bg-zinc-950 flex flex-col overflow-hidden">
      {/* Workspace Toolbar */}
      <div className="flex-shrink-0 h-14 border-b border-orange-500/20 bg-zinc-900/50 backdrop-blur-sm px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Monitor className="w-5 h-5 text-orange-500" />
          <span className="text-sm font-bold text-orange-400 uppercase tracking-wide">
            NexusOS Workspace
          </span>
          <div className="h-4 w-px bg-orange-500/30" />
          <span className="text-xs text-zinc-500">
            {activePreset && WORKSPACE_PRESETS.find(p => p.id === activePreset)?.name || 'Custom Layout'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Preset Selector */}
          <Select value={activePreset || 'custom'} onValueChange={(id) => {
            const preset = WORKSPACE_PRESETS.find(p => p.id === id);
            if (preset) applyPreset(preset);
          }}>
            <SelectTrigger className="w-40 h-8 text-xs bg-zinc-800 border-zinc-700">
              <SelectValue placeholder="Select Preset" />
            </SelectTrigger>
            <SelectContent>
              {WORKSPACE_PRESETS.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Add Widget */}
          <Dialog open={showAddWidget} onOpenChange={setShowAddWidget}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-2">
                <Plus className="w-4 h-4" />
                Add Widget
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-orange-500/30">
              <DialogHeader>
                <DialogTitle className="text-orange-400">Add Widget to Workspace</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {availableWidgets.map((widget) => (
                  <Button
                    key={widget.type}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center gap-2 border-zinc-700 hover:border-orange-500/50"
                    onClick={() => addWidget(widget.type)}
                  >
                    <widget.icon className="w-6 h-6 text-orange-500" />
                    <span className="text-xs">{widget.label}</span>
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* Save Preset */}
          <Dialog open={showSavePreset} onOpenChange={setShowSavePreset}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-2">
                <Save className="w-4 h-4" />
                Save
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-orange-500/30">
              <DialogHeader>
                <DialogTitle className="text-orange-400">Save Workspace Preset</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <input
                  type="text"
                  placeholder="Preset Name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-zinc-200"
                />
                <Button onClick={saveCustomPreset} className="w-full">
                  Save Preset
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="flex-1 overflow-auto p-4">
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768 }}
          cols={{ lg: 12, md: 8, sm: 4 }}
          rowHeight={100}
          onLayoutChange={handleLayoutChange}
          isDraggable={true}
          isResizable={true}
          onDragStart={() => setIsDragging(true)}
          onDragStop={() => setIsDragging(false)}
          onResizeStart={() => setIsDragging(true)}
          onResizeStop={() => setIsDragging(false)}
          draggableHandle=".widget-drag-handle"
        >
          {activeWidgets.map((widget) => {
            const WidgetComponent = WIDGET_REGISTRY[widget.type]?.component;
            if (!WidgetComponent) return null;

            return (
              <div
                key={widget.id}
                className="bg-zinc-900/80 border border-orange-500/20 rounded-lg overflow-hidden flex flex-col shadow-lg hover:border-orange-500/40 transition-colors"
              >
                <WidgetComponent
                  widgetId={widget.id}
                  config={widget.config}
                  onRemove={() => removeWidget(widget.id)}
                  isDragging={isDragging}
                />
              </div>
            );
          })}
        </ResponsiveGridLayout>

        {activeWidgets.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <Layout className="w-16 h-16 text-orange-500/30 mx-auto" />
              <div>
                <h3 className="text-lg font-bold text-orange-400">Empty Workspace</h3>
                <p className="text-sm text-zinc-500 mt-2">Add widgets to build your command interface</p>
              </div>
              <Button onClick={() => setShowAddWidget(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Your First Widget
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}