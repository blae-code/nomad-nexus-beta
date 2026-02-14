import React from 'react';
import type { MapNode } from '../../schemas/mapSchemas';

export type TacticalRadialIconId =
  | 'depart'
  | 'arrive'
  | 'contact'
  | 'intel-pin'
  | 'endorse'
  | 'challenge'
  | 'link-op'
  | 'attach-intel'
  | 'request-patrol';

interface TacticalRadialIconProps {
  id?: TacticalRadialIconId;
  className?: string;
}

function iconPath(id: TacticalRadialIconId | undefined): React.ReactNode {
  switch (id) {
    case 'depart':
      return (
        <>
          <path d="M3 12.5h7.5" />
          <path d="M7.2 4.1L12.4 9.3" />
          <path d="M8.9 9.3h3.5V5.8" />
        </>
      );
    case 'arrive':
      return (
        <>
          <path d="M8 3.2v8.6" />
          <path d="M5.2 9.4L8 12.2l2.8-2.8" />
          <circle cx="8" cy="13.1" r="1.05" fill="currentColor" stroke="none" />
        </>
      );
    case 'contact':
      return (
        <>
          <circle cx="8" cy="8" r="4.6" />
          <path d="M8 2.2v2.1M8 11.7v2.1M2.2 8h2.1M11.7 8h2.1" />
          <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
        </>
      );
    case 'intel-pin':
      return (
        <>
          <path d="M8 2.6a3 3 0 0 1 3 3c0 2.2-3 6.3-3 6.3s-3-4.1-3-6.3a3 3 0 0 1 3-3Z" />
          <circle cx="8" cy="5.8" r="1.05" fill="currentColor" stroke="none" />
        </>
      );
    case 'endorse':
      return <path d="M3 8.3l2.6 2.7L13 4.1" />;
    case 'challenge':
      return (
        <>
          <path d="M8 2.3l5.8 10.1H2.2L8 2.3Z" />
          <path d="M8 6v2.8" />
          <circle cx="8" cy="10.1" r="0.8" fill="currentColor" stroke="none" />
        </>
      );
    case 'link-op':
      return (
        <>
          <path d="M5.2 9.8l-1.5 1.5a2.1 2.1 0 1 0 3 3l1.5-1.5" />
          <path d="M10.8 6.2l1.5-1.5a2.1 2.1 0 1 0-3-3L7.8 3.2" />
          <path d="M5.8 10.2l4.4-4.4" />
        </>
      );
    case 'attach-intel':
      return (
        <>
          <path d="M10.7 4.3L6.1 8.9a2.2 2.2 0 1 0 3.1 3.1l4.1-4.1a3.2 3.2 0 0 0-4.6-4.6L4 8a4.2 4.2 0 0 0 6 6l3-3" />
        </>
      );
    case 'request-patrol':
      return (
        <>
          <path d="M2.7 12.2h3.9L5.2 14.1" />
          <path d="M13.3 3.8H9.4l1.4-1.9" />
          <path d="M12.6 9.8a4.8 4.8 0 0 1-7.8 1.1" />
          <path d="M3.4 6.2a4.8 4.8 0 0 1 7.8-1.1" />
        </>
      );
    default:
      return (
        <>
          <circle cx="8" cy="8" r="4.2" />
          <path d="M8 4.9v6.2M4.9 8h6.2" />
        </>
      );
  }
}

export function TacticalRadialIcon({ id, className }: TacticalRadialIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPath(id)}
    </svg>
  );
}

export interface TacticalNodeGlyphProps {
  category?: MapNode['category'];
  kind: MapNode['kind'];
  x: number;
  y: number;
  radius: number;
  selected?: boolean;
}

function polygonPoints(points: Array<[number, number]>): string {
  return points.map((entry) => `${entry[0]},${entry[1]}`).join(' ');
}

export function TacticalNodeGlyph({
  category,
  kind,
  x,
  y,
  radius,
  selected = false,
}: TacticalNodeGlyphProps) {
  const size = Math.max(0.4, Math.min(2.4, radius * 0.72));
  const stroke = selected ? 'rgba(230, 255, 241, 0.95)' : 'rgba(198, 232, 214, 0.82)';
  const fill = selected ? 'rgba(188, 247, 214, 0.2)' : 'rgba(102, 168, 138, 0.14)';
  const thin = Math.max(0.14, size * 0.16);
  const thick = Math.max(0.16, size * 0.2);

  if (kind === 'system' || category === 'system') {
    return (
      <g opacity={0.92}>
        <line x1={x} y1={y - size * 0.95} x2={x} y2={y + size * 0.95} stroke={stroke} strokeWidth={thin} />
        <line x1={x - size * 0.95} y1={y} x2={x + size * 0.95} y2={y} stroke={stroke} strokeWidth={thin} />
        <line x1={x - size * 0.68} y1={y - size * 0.68} x2={x + size * 0.68} y2={y + size * 0.68} stroke={stroke} strokeWidth={thin} />
        <line x1={x - size * 0.68} y1={y + size * 0.68} x2={x + size * 0.68} y2={y - size * 0.68} stroke={stroke} strokeWidth={thin} />
        <circle cx={x} cy={y} r={size * 0.24} fill={stroke} stroke="none" />
      </g>
    );
  }

  if (category === 'planet') {
    return (
      <g opacity={0.9}>
        <circle cx={x} cy={y} r={size * 0.5} fill={fill} stroke={stroke} strokeWidth={thin} />
        <ellipse cx={x} cy={y} rx={size * 0.9} ry={size * 0.34} fill="none" stroke={stroke} strokeWidth={thin} />
      </g>
    );
  }

  if (category === 'moon') {
    return (
      <g opacity={0.86}>
        <circle cx={x} cy={y} r={size * 0.56} fill={fill} stroke={stroke} strokeWidth={thin} />
        <circle cx={x + size * 0.19} cy={y - size * 0.04} r={size * 0.34} fill="rgba(7, 12, 14, 0.94)" stroke="none" />
      </g>
    );
  }

  if (category === 'station') {
    const hex = polygonPoints([
      [x, y - size * 0.86],
      [x + size * 0.74, y - size * 0.42],
      [x + size * 0.74, y + size * 0.42],
      [x, y + size * 0.86],
      [x - size * 0.74, y + size * 0.42],
      [x - size * 0.74, y - size * 0.42],
    ]);
    return (
      <g opacity={0.94}>
        <polygon points={hex} fill={fill} stroke={stroke} strokeWidth={thin} />
        <line x1={x - size * 0.48} y1={y} x2={x + size * 0.48} y2={y} stroke={stroke} strokeWidth={thin} />
        <line x1={x} y1={y - size * 0.48} x2={x} y2={y + size * 0.48} stroke={stroke} strokeWidth={thin} />
      </g>
    );
  }

  if (category === 'lagrange') {
    const diamond = polygonPoints([
      [x, y - size * 0.8],
      [x + size * 0.8, y],
      [x, y + size * 0.8],
      [x - size * 0.8, y],
    ]);
    return (
      <g opacity={0.9}>
        <polygon points={diamond} fill="none" stroke={stroke} strokeWidth={thin} />
        <line x1={x - size * 0.28} y1={y} x2={x + size * 0.28} y2={y} stroke={stroke} strokeWidth={thin} />
        <line x1={x} y1={y - size * 0.28} x2={x} y2={y + size * 0.28} stroke={stroke} strokeWidth={thin} />
      </g>
    );
  }

  if (category === 'orbital-marker') {
    const chevron = polygonPoints([
      [x - size * 0.68, y + size * 0.45],
      [x, y - size * 0.74],
      [x + size * 0.68, y + size * 0.45],
    ]);
    return (
      <g opacity={0.84}>
        <polygon points={chevron} fill="none" stroke={stroke} strokeWidth={thin} />
        <line x1={x} y1={y + size * 0.48} x2={x} y2={y + size * 0.9} stroke={stroke} strokeWidth={thin} />
      </g>
    );
  }

  if (category === 'jump-point') {
    return (
      <g opacity={0.88}>
        <circle cx={x} cy={y} r={size * 0.82} fill="none" stroke={stroke} strokeWidth={thin} strokeDasharray="0.45 0.34" />
        <path d={`M${x - size * 0.2} ${y + size * 0.4}L${x + size * 0.46} ${y}L${x - size * 0.2} ${y - size * 0.4}`} fill="none" stroke={stroke} strokeWidth={thick} />
      </g>
    );
  }

  return (
    <g opacity={0.82}>
      <circle cx={x} cy={y} r={size * 0.65} fill={fill} stroke={stroke} strokeWidth={thin} />
      <line x1={x - size * 0.42} y1={y} x2={x + size * 0.42} y2={y} stroke={stroke} strokeWidth={thin} />
    </g>
  );
}
