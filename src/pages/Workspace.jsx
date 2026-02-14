import React, { useState, useEffect, useMemo } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Layout, Save, Plus, Settings, Monitor, User, X, Edit2, Check } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { WIDGET_REGISTRY } from '@/components/workspace/WidgetRegistry';
import { WORKSPACE_PRESETS, getPresetForRole } from '@/components/workspace/WorkspacePresets';
import { base44 } from '@/api/base44Client';

const ResponsiveGridLayout = WidthProvider(Responsive);

const STORAGE_KEY = 'nexus.workspace.layout';
const PRESET_KEY = 'nexus.workspace.activePreset';

const MAX_WIDGETS_PER_PAGE = 20;

export default function Workspace() {
  const { user } = useAuth();
  const [pages, setPages] = useState([{ id: 'page-1', label: 'Main', widgets: [], layouts: { lg: [], md: [], sm: [] } }]);
  const [activePageId, setActivePageId] = useState('page-1');
  const [isDragging, setIsDragging] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [editingPageId, setEditingPageId] = useState(null);
  const [editingPageLabel, setEditingPageLabel] = useState('');

  const activePage = pages.find(p => p.id === activePageId) || pages[0];
  const activeWidgets = activePage.widgets;
  const layouts = activePage.layouts;

  // Load saved pages from backend, fallback to localStorage, then role-based preset
  useEffect(() => {
    if (!user?.id) return;

    const loadLayout = async () => {
      try {
        const savedLayouts = await base44.entities.WorkspaceLayout.filter({
          created_by: user.id,
        });

        if (savedLayouts.length > 0) {
          const latest = savedLayouts.sort((a, b) => 
            new Date(b.updated_date) - new Date(a.updated_date)
          )[0];
          
          if (latest.pages && latest.pages.length > 0) {
            setPages(latest.pages);
            setActivePageId(latest.pages[0].id);
          }
          setActivePreset(latest.preset_id || 'custom');
          
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            pages: latest.pages,
            savedAt: new Date().toISOString(),
          }));
          return;
        }
      } catch (error) {
        console.warn('[Workspace] Failed to load from backend:', error);
      }

      // Fallback to localStorage
      const savedLayoutJson = localStorage.getItem(STORAGE_KEY);
      const savedPreset = localStorage.getItem(PRESET_KEY);

      if (savedLayoutJson) {
        try {
          const parsed = JSON.parse(savedLayoutJson);
          if (parsed.pages) {
            setPages(parsed.pages);
            setActivePageId(parsed.pages[0]?.id || 'page-1');
          }
          setActivePreset(savedPreset || 'custom');
          return;
        } catch (e) {
          console.warn('[Workspace] Failed to parse saved layout:', e);
        }
      }

      // Start with blank workspace - no default preset
      // Users will customize as needed
    };

    loadLayout();
  }, [user]);

  const applyPreset = (preset) => {
    const newPages = [{ 
      id: 'page-1', 
      label: 'Main', 
      widgets: preset.widgets, 
      layouts: preset.layouts 
    }];
    setPages(newPages);
    setActivePageId('page-1');
    setActivePreset(preset.id);
    localStorage.setItem(PRESET_KEY, preset.id);
    savePages(newPages);
  };

  const savePages = async (pagesData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      pages: pagesData,
      savedAt: new Date().toISOString(),
    }));

    if (user?.id) {
      try {
        const existing = await base44.entities.WorkspaceLayout.filter({
          created_by: user.id,
        });

        if (existing.length > 0) {
          await base44.entities.WorkspaceLayout.update(existing[0].id, {
            pages: pagesData,
            preset_id: activePreset,
          });
        } else {
          await base44.entities.WorkspaceLayout.create({
            pages: pagesData,
            preset_id: activePreset,
            created_by: user.id,
          });
        }
      } catch (error) {
        console.error('[Workspace] Failed to sync to backend:', error);
      }
    }
  };

  const handleLayoutChange = (currentLayout, allLayouts) => {
    const updatedPages = pages.map(p => 
      p.id === activePageId ? { ...p, layouts: allLayouts } : p
    );
    setPages(updatedPages);
    savePages(updatedPages);
  };

  const addWidget = (widgetType) => {
    const widgetDef = WIDGET_REGISTRY[widgetType];
    if (!widgetDef) return;

    let targetPage = activePage;
    
    // Auto-overflow: if current page is full, create new page
    if (activePage.widgets.length >= MAX_WIDGETS_PER_PAGE) {
      const newPageId = `page-${Date.now()}`;
      targetPage = {
        id: newPageId,
        label: `Page ${pages.length + 1}`,
        widgets: [],
        layouts: { lg: [], md: [], sm: [] }
      };
      const updatedPages = [...pages, targetPage];
      setPages(updatedPages);
      setActivePageId(newPageId);
      savePages(updatedPages);
    }

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

    const updatedPages = pages.map(p => 
      p.id === targetPage.id ? {
        ...p,
        widgets: [...p.widgets, newWidget],
        layouts: {
          lg: [...p.layouts.lg, newLayout],
          md: [...p.layouts.md, { ...newLayout, w: Math.min(newLayout.w, 6) }],
          sm: [...p.layouts.sm, { ...newLayout, w: 12 }],
        }
      } : p
    );
    setPages(updatedPages);
    savePages(updatedPages);
    setShowAddWidget(false);
  };

  const removeWidget = (widgetId) => {
    const updatedPages = pages.map(p => 
      p.id === activePageId ? {
        ...p,
        widgets: p.widgets.filter(w => w.id !== widgetId),
        layouts: {
          lg: p.layouts.lg.filter(l => l.i !== widgetId),
          md: p.layouts.md.filter(l => l.i !== widgetId),
          sm: p.layouts.sm.filter(l => l.i !== widgetId),
        }
      } : p
    );
    setPages(updatedPages);
    savePages(updatedPages);
  };

  const addPage = () => {
    const newPageId = `page-${Date.now()}`;
    const newPage = {
      id: newPageId,
      label: `Page ${pages.length + 1}`,
      widgets: [],
      layouts: { lg: [], md: [], sm: [] }
    };
    const updatedPages = [...pages, newPage];
    setPages(updatedPages);
    setActivePageId(newPageId);
    savePages(updatedPages);
  };

  const deletePage = (pageId) => {
    if (pages.length <= 1) return;
    const updatedPages = pages.filter(p => p.id !== pageId);
    setPages(updatedPages);
    if (activePageId === pageId) {
      setActivePageId(updatedPages[0].id);
    }
    savePages(updatedPages);
  };

  const renamePage = (pageId, newLabel) => {
    const updatedPages = pages.map(p => 
      p.id === pageId ? { ...p, label: newLabel } : p
    );
    setPages(updatedPages);
    savePages(updatedPages);
    setEditingPageId(null);
    setEditingPageLabel('');
  };

  const saveCustomPreset = async () => {
    if (!presetName.trim()) return;

    try {
      await base44.entities.WorkspaceLayout.create({
        name: presetName,
        role: 'custom',
        pages: pages,
        created_by: user?.id,
      });
      setShowSavePreset(false);
      setPresetName('');
      setActivePreset(`custom-${Date.now()}`);
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
      <div className="flex-shrink-0 h-12 border-b-2 border-red-700/50 bg-black/95 backdrop-blur-sm px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-6 bg-red-500 rounded-sm" />
          <Monitor className="w-4 h-4 text-red-500" />
          <span className="text-sm font-black text-white uppercase tracking-[0.2em]">
            WORKSPACE
          </span>
          <div className="h-4 w-px bg-red-700/40" />
          <span className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">
            {activePreset && WORKSPACE_PRESETS.find(p => p.id === activePreset)?.name || 'Custom'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Preset Selector */}
          <Select value={activePreset || 'custom'} onValueChange={(id) => {
            const preset = WORKSPACE_PRESETS.find(p => p.id === id);
            if (preset) applyPreset(preset);
          }}>
            <SelectTrigger className="w-40 h-7 text-[10px] bg-zinc-900/60 border-red-700/40 hover:border-red-500/60 font-mono">
              <SelectValue placeholder="Select Preset" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-red-700/40">
              {WORKSPACE_PRESETS.map((preset) => (
                <SelectItem key={preset.id} value={preset.id} className="text-xs">
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Add Widget */}
          <Dialog open={showAddWidget} onOpenChange={setShowAddWidget}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 gap-2 text-[10px] border-red-700/40 hover:border-red-500/60">
                <Plus className="w-3 h-3" />
                Add Widget
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-black/95 border-2 border-red-700/60 max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="text-red-400 font-black uppercase tracking-wider">Add Widget to Workspace</DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto">
                {Object.entries(
                  availableWidgets.reduce((acc, w) => {
                    const cat = w.category || 'Other';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(w);
                    return acc;
                  }, {})
                ).map(([category, widgets]) => (
                  <div key={category} className="mb-4">
                    <div className="text-[10px] font-bold text-red-500 uppercase tracking-[0.2em] mb-2 px-2 border-l-2 border-red-700">
                      {category}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {widgets.map((widget) => (
                        <Button
                          key={widget.type}
                          variant="outline"
                          className="h-20 flex flex-col items-center justify-center gap-2 border-zinc-700/60 hover:border-red-500/60 bg-zinc-900/40 hover:bg-red-950/20"
                          onClick={() => addWidget(widget.type)}
                        >
                          <widget.icon className="w-5 h-5 text-red-500" />
                          <span className="text-[10px] text-zinc-400 text-center leading-tight">{widget.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* Save Preset */}
          <Dialog open={showSavePreset} onOpenChange={setShowSavePreset}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 gap-2 text-[10px] border-red-700/40 hover:border-red-500/60">
                <Save className="w-3 h-3" />
                Save
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-black/95 border-2 border-red-700/60">
              <DialogHeader>
                <DialogTitle className="text-red-400 font-black uppercase tracking-wider">Save Workspace Preset</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <input
                  type="text"
                  placeholder="Preset Name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900/60 border border-red-700/40 rounded text-sm text-zinc-200 focus:border-red-500/60 focus:outline-none"
                />
                <Button onClick={saveCustomPreset} className="w-full bg-red-600 hover:bg-red-500">
                  Save Preset
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Page Tabs */}
      <div className="flex-shrink-0 border-b border-red-700/40 bg-black/60 backdrop-blur-sm px-4 flex items-center gap-1 overflow-x-auto">
        {pages.map(page => (
          <div key={page.id} className="flex items-center gap-1 group">
            {editingPageId === page.id ? (
              <div className="flex items-center gap-1 py-2">
                <input
                  autoFocus
                  value={editingPageLabel}
                  onChange={(e) => setEditingPageLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') renamePage(page.id, editingPageLabel);
                    if (e.key === 'Escape') { setEditingPageId(null); setEditingPageLabel(''); }
                  }}
                  className="w-24 h-6 px-2 bg-zinc-900 border border-red-700/60 rounded text-[10px] text-zinc-200 focus:outline-none"
                />
                <button
                  onClick={() => renamePage(page.id, editingPageLabel)}
                  className="p-1 hover:bg-red-950/40 rounded"
                >
                  <Check className="w-3 h-3 text-green-500" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActivePageId(page.id)}
                className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${
                  activePageId === page.id
                    ? 'text-red-400 border-b-2 border-red-500'
                    : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                {page.label}
              </button>
            )}
            {pages.length > 1 && activePageId === page.id && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => { setEditingPageId(page.id); setEditingPageLabel(page.label); }}
                  className="p-1 hover:bg-red-950/40 rounded"
                >
                  <Edit2 className="w-3 h-3 text-zinc-600 hover:text-red-400" />
                </button>
                <button
                  onClick={() => deletePage(page.id)}
                  className="p-1 hover:bg-red-950/40 rounded"
                >
                  <X className="w-3 h-3 text-zinc-600 hover:text-red-400" />
                </button>
              </div>
            )}
          </div>
        ))}
        <button
          onClick={addPage}
          className="px-3 py-2 text-[10px] text-zinc-600 hover:text-red-400 transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Grid Layout */}
      <div className="flex-1 overflow-auto p-3 pb-20">
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
                className="bg-black/95 border border-red-700/40 rounded overflow-hidden flex flex-col shadow-2xl shadow-red-500/10 hover:border-red-500/60 transition-all duration-200"
                style={{ willChange: isDragging ? 'transform' : 'auto' }}
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
            <div className="text-center space-y-4 max-w-md">
              <div className="relative">
                <Layout className="w-16 h-16 text-red-700/40 mx-auto" />
                <div className="absolute inset-0 blur-xl bg-red-500/20 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-black text-red-400 uppercase tracking-[0.2em]">Page Empty</h3>
                <p className="text-xs text-zinc-600 mt-2 uppercase tracking-wider">Add widgets to this page</p>
              </div>
              <Button onClick={() => setShowAddWidget(true)} className="gap-2 bg-red-600 hover:bg-red-500">
                <Plus className="w-4 h-4" />
                Add Widget
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer - Fixed at bottom with padding for content */}
      <div className="flex-shrink-0 h-8 border-t border-red-700/40 bg-black/95 backdrop-blur-sm px-4 flex items-center justify-between">
        <div className="text-[9px] text-zinc-600 font-mono uppercase tracking-wider">
          {activePage.widgets.length} / {MAX_WIDGETS_PER_PAGE} Widgets • Page {pages.findIndex(p => p.id === activePageId) + 1} / {pages.length}
        </div>
        <div className="text-[9px] text-zinc-700 font-mono">
          NexusOS Workspace v2.0
        </div>
      </div>
    </div>
  );
}