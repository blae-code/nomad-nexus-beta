# NexusOS Validation Integration Guide

## Overview

This document describes how to integrate validation hooks into NexusOS components for automatic compliance monitoring during development.

## Validation Hooks

### useStyleGuideValidation

Validates component compliance with the NexusOS Style Guide (typography, spacing, colors, icons).

**Usage:**
```javascript
import { useStyleGuideValidation } from '@/components/nexus-os/validators';

export default function MyComponent() {
  const validationRef = useStyleGuideValidation('MyComponent', { 
    strict: false,  // Set to true to throw on violations
    enabled: true   // Set to false to disable validation
  });
  
  return <div ref={validationRef}>...</div>;
}
```

**Output:**
- Console logs with compliance score (0-100%)
- List of violations grouped by category
- Pass/Warn/Fail status indicator

---

### useViewportValidation

Validates that components fit within required viewport constraints (1366×768, 1440×900, 1920×1080) with no horizontal scroll.

**Usage:**
```javascript
import { useViewportValidation } from '@/components/nexus-os/validators';

export default function MyComponent() {
  const validationRef = useViewportValidation('MyComponent', {
    allowInternalScroll: true  // Allow scroll inside modals/drawers
  });
  
  return <div ref={validationRef}>...</div>;
}
```

---

### useTypographyValidation

Validates typography compliance (approved font-sizes, weights, tracking, text-transform).

**Usage:**
```javascript
import { useTypographyValidation } from '@/components/nexus-os/validators';

export default function MyComponent() {
  const validationRef = useTypographyValidation('MyComponent');
  
  return <div ref={validationRef}>...</div>;
}
```

---

### useRegressionTests

Runs comprehensive regression checks (TypeScript syntax, missing primitives, decorative gradients, etc.).

**Usage:**
```javascript
import { useRegressionTests } from '@/components/nexus-os/validators';

export default function MyComponent() {
  const validationRef = useRegressionTests('MyComponent', {
    includeTypography: true,
    includeViewport: true,
    includeStyle: true,
    strict: false
  });
  
  return <div ref={validationRef}>...</div>;
}
```

---

## Batch Compliance Auditing

For testing multiple components programmatically (e.g., in CI/CD or during smoke tests):

```javascript
import { runAndLogAudit } from '@/components/nexus-os/validators';

// Collect component refs
const components = [
  { element: document.querySelector('[data-component="MapStageCanvas"]'), name: 'MapStageCanvas' },
  { element: document.querySelector('[data-component="MapDock"]'), name: 'MapDock' },
  // ...
];

// Run audit and log results
const summary = runAndLogAudit(components, {
  includeStyle: true,
  includeViewport: true,
  includeTypography: true,
  includeRegression: false
});

// Check if all passed
if (summary.failed === 0 && summary.errors === 0) {
  console.log('✅ All components passed compliance audit');
}
```

---

## Integration Checklist

When adding validation to a component:

1. **Import the appropriate hook(s)** at the top of the file
2. **Create a validation ref** inside the component function
3. **Attach the ref** to the root element of the component's render output
4. **Run the app in development mode** and check the browser console for validation output
5. **Fix violations** reported in the console
6. **Commit changes** once compliance score is ≥90%

---

## Validation Report Format

All validation hooks output structured console logs:

```
[StyleGuide] MyComponent - Compliance: 85%
[StyleGuide] MyComponent - 2 violations (1 high, 1 medium, 0 low)
  [StyleGuide] MyComponent - Violations (2)
    - [FONT_SIZE] Invalid font-size: text-base. Use text-[8px] or text-[10px] for system labels.
    - [SPACING] Invalid padding: p-3. Use approved spacing from design tokens.
[StyleGuide] MyComponent - ⚠️ NEEDS IMPROVEMENT
```

---

## Best Practices

1. **Always validate in development mode** - hooks are no-ops in production
2. **Aim for ≥90% compliance** - this indicates strong adherence to design standards
3. **Fix high-severity violations first** - these have the most impact on UX consistency
4. **Use batch audits for regression testing** - run before deploying to catch drift
5. **Don't suppress warnings** - they indicate areas for improvement

---

## Disabling Validation

To temporarily disable validation for a component:

```javascript
const validationRef = useStyleGuideValidation('MyComponent', { enabled: false });
```

Or remove the hook entirely if the component is exempt from validation (e.g., third-party UI libraries).

---

## Integration Status

### ✅ Integrated Components (Phase 8)
- MapStageCanvas
- MapCommandStrip
- MapDock
- NexusTaskbar

### 🔄 Pending Integration
- TacticalMapPanel
- CommsNetworkConsole
- OperationFocusApp
- SystemAdminFocusApp
- (See STYLE_GUIDE.md for full component list)

---

## Related Documentation

- [STYLE_GUIDE.md](../STYLE_GUIDE.md) - Complete design system rules
- [TOKEN_USAGE_GUIDE.md](../ui/tokens/TOKEN_USAGE_GUIDE.md) - Token semantics and usage
- [styleGuideValidator.js](./styleGuideValidator.js) - Core validation logic