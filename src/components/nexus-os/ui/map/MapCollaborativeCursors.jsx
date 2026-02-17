import React from 'react';

export default function MapCollaborativeCursors({ participants, currentUserId, mapTransform }) {
  if (!Array.isArray(participants) || participants.length === 0) return null;

  return (
    <g transform={mapTransform}>
      {participants
        .filter(p => p.member_profile_id !== currentUserId)
        .map(participant => {
          const x = participant.cursor_x || 50;
          const y = participant.cursor_y || 50;
          const color = participant.color || '#3b82f6';
          const name = participant.member_profile_id?.slice(0, 8) || 'User';

          return (
            <g key={participant.member_profile_id}>
              {/* Cursor pointer */}
              <g transform={`translate(${x}, ${y})`}>
                <path
                  d="M 0 0 L 0 3 L 0.8 2.4 L 1.2 3.6 L 1.8 3.4 L 1.4 2.2 L 2.2 2.2 Z"
                  fill={color}
                  stroke="rgba(0,0,0,0.6)"
                  strokeWidth={0.12}
                />
                {/* Name label */}
                <text
                  x={2.5}
                  y={0.5}
                  style={{
                    fill: color,
                    fontSize: '1.4px',
                    fontWeight: 600,
                    textShadow: '0 0 2px rgba(0,0,0,0.8)',
                  }}
                >
                  {name}
                </text>
              </g>
            </g>
          );
        })}
    </g>
  );
}