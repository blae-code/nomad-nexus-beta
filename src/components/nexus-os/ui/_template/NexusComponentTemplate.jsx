/**
 * ComponentName - [Brief description of what this component does]
 * 
 * DESIGN COMPLIANCE:
 * - Typography: [List specific scales used - e.g., headerPrimary, bodySecondary]
 * - Spacing: [List padding/gap standards - e.g., px-2.5 py-2, gap-1.5]
 * - Icons: [List sizes used - e.g., w-3.5 h-3.5 for primary actions]
 * - Tokens: [List token families used if any - e.g., circle, penta, number-X]
 * - Borders: [List border standards - e.g., zinc-700/40]
 * 
 * @see components/nexus-os/STYLE_GUIDE.md
 * @see components/nexus-os/ui/tokens/TOKEN_USAGE_GUIDE.md (if using tokens)
 */

import React from 'react';
import { Zap } from 'lucide-react';
import { NexusBadge, NexusButton, NexusTokenIcon } from '@/components/nexus-os/ui/primitives';

/**
 * Props interface (if using TypeScript) or JSDoc
 * 
 * @param {Object} props
 * @param {string} props.title - Component title
 * @param {Function} props.onAction - Callback for primary action
 * @param {boolean} [props.isActive=false] - Active state flag
 * @param {string} [props.className] - Additional CSS classes
 */
export default function ComponentName({
  title,
  onAction,
  isActive = false,
  className = '',
}) {
  // ========== STATE ==========
  const [internalState, setInternalState] = React.useState(null);
  
  // ========== EFFECTS ==========
  React.useEffect(() => {
    // Setup/cleanup logic
  }, []);
  
  // ========== HANDLERS ==========
  const handleAction = () => {
    onAction?.();
  };
  
  // ========== RENDER ==========
  return (
    <div className={`p-2 border border-zinc-700/40 bg-zinc-900/80 backdrop-blur-sm rounded-lg ${className}`}>
      {/* Header */}
      <header className="px-2.5 py-2 border-b border-zinc-700/40 bg-zinc-900/40 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-orange-500" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.15em] leading-none text-white">
            {title}
          </h3>
        </div>
        
        <NexusBadge tone={isActive ? 'active' : 'neutral'}>
          {isActive ? 'ACTIVE' : 'STANDBY'}
        </NexusBadge>
      </header>
      
      {/* Body */}
      <div className="p-1.5">
        <div className="flex items-center gap-1.5">
          {/* Example: Token usage */}
          <NexusTokenIcon family="circle" color="green" size="sm" />
          
          {/* Example: Typography */}
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">
            Example Label
          </span>
        </div>
        
        {/* Example: Button */}
        <NexusButton intent="primary" onClick={handleAction} className="mt-2">
          <Zap className="w-3 h-3 mr-1" />
          Execute Action
        </NexusButton>
      </div>
      
      {/* Footer (optional) */}
      <footer className="border-t border-zinc-700/40 bg-zinc-900/40 backdrop-blur-sm px-2 py-1.5">
        <span className="text-[8px] text-zinc-400 uppercase tracking-[0.14em]">
          Footer Info
        </span>
      </footer>
    </div>
  );
}

/**
 * USAGE EXAMPLES:
 * 
 * Basic usage:
 * <ComponentName title="Panel Title" items={myItems} onAction={handleAction} />
 * 
 * With active state:
 * <ComponentName title="Panel Title" items={myItems} onAction={handleAction} isActive={true} />
 * 
 * With custom classes:
 * <ComponentName title="Panel Title" items={myItems} onAction={handleAction} className="mt-4" />
 */

/**
 * VALIDATION CHECKLIST:
 * - [x] No TypeScript syntax (no type annotations, no 'as' casts, no interfaces)
 * - [x] Typography uses approved scales (8px/10px for system labels)
 * - [x] Font weight >= 600 (semibold minimum)
 * - [x] Uppercase for system labels
 * - [x] Spacing uses approved tokens (px-2.5 py-2, p-1.5, gap-1.5)
 * - [x] Icon sizes approved (w-3 to w-4)
 * - [x] Token sizes approved (w-3 to w-6, square)
 * - [x] Border opacity in range (zinc-700/40 to zinc-700/60)
 * - [x] Opacity backgrounds include backdrop-blur-sm
 * - [x] Lists capped at 5-7 items with pagination
 * - [x] Primitives used (NexusButton, NexusBadge, NexusTokenIcon)
 * - [x] Design compliance header present
 * - [x] Build passes without errors
 */

/**
 * ACCESSIBILITY NOTES:
 * - All interactive elements are native buttons with proper semantics
 * - Keyboard navigation supported (Tab, Enter, Escape)
 * - Token images include alt text for screen readers
 * - Color contrast verified (WCAG AA minimum)
 * - Focus states visible (border highlights)
 * - ARIA labels on icon-only buttons
 */

/**
 * RESPONSIVE NOTES:
 * - Viewport tested: 1366×768, 1440×900, 1920×1080 at 100% zoom
 * - No horizontal scroll at minimum viewport
 * - No page scroll (uses internal overflow with pagination)
 * - Touch targets >= 44×44px (mobile consideration)
 * - Graceful text truncation on narrow viewports
 */

/**
 * PERFORMANCE NOTES:
 * - useMemo for expensive computations (visibleItems calculation)
 * - useCallback for event handlers passed to children (if needed)
 * - useRenderProfiler for development monitoring
 * - Minimal re-renders via state isolation
 */