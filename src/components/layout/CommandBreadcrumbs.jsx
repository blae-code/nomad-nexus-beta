import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const BREADCRUMB_MAP = {
  '/hub': [{ label: 'HUB', href: '/hub' }],
  '/nomadopsdashboard': [
    { label: 'COMMAND', href: '/nomadopsdashboard' }
  ],
  '/events': [
    { label: 'COMMAND', href: '/nomadopsdashboard' },
    { label: 'OPS BOARD', href: '/events' }
  ],
  '/commsconsole': [
    { label: 'COMMAND', href: '/nomadopsdashboard' },
    { label: 'COMMS NET', href: '/commsconsole' }
  ],
  '/admin': [
    { label: 'COMMAND', href: '/nomadopsdashboard' },
    { label: 'ADMIN', href: '/admin' }
  ]
};

export default function CommandBreadcrumbs() {
  const location = useLocation();
  
  const breadcrumbs = useMemo(() => {
    const path = location.pathname.toLowerCase();
    
    // Check if event detail view (Events?id=xxx)
    if (path === '/events') {
      const params = new URLSearchParams(location.search);
      const eventId = params.get('id');
      if (eventId) {
        return [
          { label: 'COMMAND', href: '/nomadopsdashboard' },
          { label: 'OPS BOARD', href: '/events' },
          { label: `OP-${eventId.slice(0, 6).toUpperCase()}`, href: null }
        ];
      }
    }

    // Check if comms net view (CommsConsole?net=xxx)
    if (path === '/commsconsole') {
      const params = new URLSearchParams(location.search);
      const netCode = params.get('net');
      if (netCode) {
        return [
          { label: 'COMMAND', href: '/nomadopsdashboard' },
          { label: 'COMMS NET', href: '/commsconsole' },
          { label: netCode.toUpperCase(), href: null }
        ];
      }
    }

    return BREADCRUMB_MAP[path] || [{ label: 'HUB', href: '/hub' }];
  }, [location]);

  return (
    <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 px-3 py-2 border-b border-zinc-800/50">
      {breadcrumbs.map((crumb, idx) => (
        <React.Fragment key={idx}>
          {crumb.href ? (
            <a
              href={crumb.href}
              className="hover:text-zinc-300 transition-colors cursor-pointer"
            >
              {crumb.label}
            </a>
          ) : (
            <span className="text-zinc-400">{crumb.label}</span>
          )}
          {idx < breadcrumbs.length - 1 && (
            <ChevronRight className="w-3 h-3 text-zinc-700" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}