# NexusOS Token Usage Guide

## Token vs Lucide
- Use tokens for tactical semantics: status, priority, objective, role, channel type, roster number.
- Use Lucide for generic UI actions: open/close, edit, settings, navigation.

## Family Mapping
- `circle`: live state (ready, tx, muted, offline)
- `hex`: channel/network classification
- `target`, `target-alt`, `objective`: mission/objective/asset markers
- `penta`: operation phase/status
- `triangle`: alert/priority
- `number-0` to `number-13`: roster/order/count markers
- `hospital`, `mechanics`, `fuel`, `energy`, `ammunition`, `food`, `shelter`: specialist/resource semantics

## Color Semantics
- `red`: danger/hostile/critical
- `orange`: active/transmit/priority
- `yellow`: warning/caution
- `green`: healthy/ready/secure
- `blue`: allied/info
- `cyan`: support/utility
- `grey`: inactive/offline
- `purple` + variants: secure/encrypted/degraded escalation

## Variant Rules
- `base`: normal state
- `v1`: secure/encrypted/hardened
- `v2`: critical/degraded/escalated

## Size Rules
- `sm` (`w-3 h-3`): compact rows and badges
- `md` (`w-4 h-4`): default list and panel usage
- `lg` (`w-5 h-5`): prominent card/header markers
- `xl` (`w-6 h-6`): focus markers only

## Patterns
- Roster row: number token + callsign + role token + status token.
- Channel row: hex token + name + unread number token.
- Map marker: semantic token image per overlay type.
- Orders feed: status token + short text, newest first.

## Anti-Patterns
- Mixing token and Lucide for the same semantic role in one row.
- Decorative token use without meaning.
- Missing `alt`/`aria-label` for token-only signals.
- Red for success or green for danger.

