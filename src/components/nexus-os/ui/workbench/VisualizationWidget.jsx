import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, BarChart3, Activity, PieChart as PieIcon, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const CHART_COLORS = ['#f97316', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

/**
 * VisualizationWidget — Advanced charting component with real-time updates
 */
export default function VisualizationWidget({ config, onConfigChange, previewMode = false }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const chartType = config?.chartType || 'line';
  const dataSource = config?.dataSource || 'static';
  const entityName = config?.entityName || null;
  const dataField = config?.dataField || null;
  const labelField = config?.labelField || null;
  const refreshInterval = config?.refreshInterval || 30000; // 30s default
  const staticData = config?.staticData || [];
  const colors = config?.colors || CHART_COLORS;

  // Load data based on source
  useEffect(() => {
    if (previewMode) {
      // Use static data in preview
      setData(staticData.length > 0 ? staticData : generateSampleData(chartType));
      return;
    }

    if (dataSource === 'static') {
      setData(staticData);
      return;
    }

    if (dataSource === 'entity' && entityName && dataField) {
      loadEntityData();
    }
  }, [dataSource, entityName, dataField, labelField, staticData, chartType, previewMode]);

  // Real-time updates via polling
  useEffect(() => {
    if (previewMode || dataSource !== 'entity' || !entityName || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      loadEntityData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [dataSource, entityName, dataField, refreshInterval, previewMode]);

  // Real-time updates via subscription
  useEffect(() => {
    if (previewMode || dataSource !== 'entity' || !entityName) return;

    const unsubscribe = base44.entities[entityName]?.subscribe?.(() => {
      loadEntityData();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [dataSource, entityName, previewMode]);

  const loadEntityData = async () => {
    if (!entityName || !dataField) return;

    setLoading(true);
    setError(null);

    try {
      const records = await base44.entities[entityName].list('-created_date', 50);
      
      const chartData = records.map((record, idx) => {
        const value = typeof record[dataField] === 'number' ? record[dataField] : 0;
        const label = labelField && record[labelField] 
          ? String(record[labelField]).slice(0, 20)
          : `#${idx + 1}`;
        
        return {
          name: label,
          value: value,
          timestamp: record.created_date,
        };
      }).reverse(); // Oldest first for time series

      setData(chartData);
      setLastUpdate(Date.now());
    } catch (err) {
      console.error('[Viz] Failed to load entity data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const renderChart = () => {
    if (error) {
      return (
        <div className="flex items-center justify-center h-full text-red-400 text-xs">
          Error: {error}
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-zinc-500 text-xs">
          No data available
        </div>
      );
    }

    const commonProps = {
      data,
      margin: { top: 5, right: 10, left: 0, bottom: 5 },
    };

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.3} />
              <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} />
              <YAxis stroke="#a1a1aa" fontSize={10} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '0.375rem' }}
                labelStyle={{ color: '#a1a1aa', fontSize: '11px' }}
                itemStyle={{ color: '#f4f4f5', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.3} />
              <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} />
              <YAxis stroke="#a1a1aa" fontSize={10} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '0.375rem' }}
                labelStyle={{ color: '#a1a1aa', fontSize: '11px' }}
                itemStyle={{ color: '#f4f4f5', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="value" fill={colors[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart {...commonProps}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colors[0]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" opacity={0.3} />
              <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} />
              <YAxis stroke="#a1a1aa" fontSize={10} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '0.375rem' }}
                labelStyle={{ color: '#a1a1aa', fontSize: '11px' }}
                itemStyle={{ color: '#f4f4f5', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Area type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={60}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '0.375rem', fontSize: '11px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return <div className="text-zinc-500 text-xs">Unsupported chart type</div>;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between px-2 py-1 border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          {getChartIcon(chartType)}
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
            {chartType} Chart
          </span>
          {dataSource === 'entity' && (
            <span className="text-[9px] text-zinc-500">
              {entityName}
            </span>
          )}
        </div>
        {loading && (
          <RefreshCw className="w-3 h-3 text-orange-400 animate-spin" />
        )}
        {!previewMode && dataSource === 'entity' && !loading && (
          <button
            onClick={loadEntityData}
            className="text-[10px] text-zinc-400 hover:text-orange-400 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 p-2">
        {renderChart()}
      </div>
      {!previewMode && lastUpdate && (
        <div className="flex-shrink-0 px-2 py-1 border-t border-zinc-800/50">
          <span className="text-[9px] text-zinc-600">
            Updated {new Date(lastUpdate).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}

function getChartIcon(type) {
  switch (type) {
    case 'line':
      return <TrendingUp className="w-3 h-3 text-orange-400" />;
    case 'bar':
      return <BarChart3 className="w-3 h-3 text-orange-400" />;
    case 'area':
      return <Activity className="w-3 h-3 text-orange-400" />;
    case 'pie':
      return <PieIcon className="w-3 h-3 text-orange-400" />;
    default:
      return <TrendingUp className="w-3 h-3 text-orange-400" />;
  }
}

function generateSampleData(chartType) {
  if (chartType === 'pie') {
    return [
      { name: 'Category A', value: 400 },
      { name: 'Category B', value: 300 },
      { name: 'Category C', value: 200 },
      { name: 'Category D', value: 100 },
    ];
  }

  return Array.from({ length: 12 }, (_, i) => ({
    name: `Week ${i + 1}`,
    value: Math.floor(Math.random() * 100) + 50,
  }));
}