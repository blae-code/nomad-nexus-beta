import React from 'react';

export default function MapDrawingLayer({ elements, mapTransform, onSelectElement }) {
  if (!Array.isArray(elements) || elements.length === 0) return null;

  return (
    <g transform={mapTransform}>
      {elements.map(element => {
        const data = element.data || {};
        
        if (element.element_type === 'circle') {
          return (
            <circle
              key={element.id}
              cx={data.cx || 50}
              cy={data.cy || 50}
              r={data.radius || 5}
              fill={data.fill || 'rgba(59, 130, 246, 0.2)'}
              stroke={data.stroke || 'rgba(59, 130, 246, 0.8)'}
              strokeWidth={data.strokeWidth || 0.4}
              onClick={(e) => {
                e.stopPropagation();
                onSelectElement?.(element.id);
              }}
              style={{ cursor: 'pointer' }}
            />
          );
        }
        
        if (element.element_type === 'marker') {
          return (
            <g
              key={element.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectElement?.(element.id);
              }}
              style={{ cursor: 'pointer' }}
            >
              <polygon
                points={`${data.x || 50},${(data.y || 50) - 2} ${(data.x || 50) + 1.5},${(data.y || 50) + 1.5} ${(data.x || 50) - 1.5},${(data.y || 50) + 1.5}`}
                fill={data.fill || 'rgba(239, 68, 68, 0.7)'}
                stroke={data.stroke || 'rgba(239, 68, 68, 1)'}
                strokeWidth={0.3}
              />
              {data.label && (
                <text
                  x={data.x || 50}
                  y={(data.y || 50) + 3}
                  textAnchor="middle"
                  style={{
                    fill: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '1.2px',
                    fontWeight: 600,
                  }}
                >
                  {data.label}
                </text>
              )}
            </g>
          );
        }
        
        if (element.element_type === 'path') {
          const points = Array.isArray(data.points) ? data.points : [];
          if (points.length < 2) return null;
          
          const pathD = points
            .map((point, idx) => {
              const cmd = idx === 0 ? 'M' : 'L';
              return `${cmd} ${point.x} ${point.y}`;
            })
            .join(' ');
          
          return (
            <path
              key={element.id}
              d={pathD}
              fill="none"
              stroke={data.stroke || 'rgba(251, 191, 36, 0.8)'}
              strokeWidth={data.strokeWidth || 0.3}
              strokeDasharray={data.dashed ? '1 1' : undefined}
              onClick={(e) => {
                e.stopPropagation();
                onSelectElement?.(element.id);
              }}
              style={{ cursor: 'pointer' }}
            />
          );
        }
        
        return null;
      })}
    </g>
  );
}