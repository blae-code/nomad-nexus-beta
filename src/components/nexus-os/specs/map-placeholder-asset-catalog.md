# Tactical Map Placeholder Asset Catalog (Industrial/Military)

This is a placeholder asset baseline for NexusOS map design and skinning.  
Each asset is intentionally tactical and modular so final art can swap 1:1 without refactoring map logic.

## 1) System and Celestial Core

| Asset ID | Category | Placeholder | Usage |
|---|---|---|---|
| `sys-core-main` | System | Heavy ring + central core glyph | Main system node (Stanton/Pyro/Nyx) |
| `sys-core-secondary` | System | Thin ring + hash spokes | Secondary/fallback systems |
| `planet-major` | Planet | Filled sphere + armor ring | Primary planets |
| `moon-minor` | Moon | Small sphere + quarter ring | Moons/sub-bodies |
| `jump-point` | Navigation | Diamond gate icon | Inter-system jump routes |

## 2) Stations, Lagrange, Orbital Markers

| Asset ID | Category | Placeholder | Usage |
|---|---|---|---|
| `station-orbital` | Station | Hex bastion silhouette | Orbital stations |
| `station-forward` | Station | Split chevron bunker mark | Forward hubs |
| `lagrange-l1` | Lagrange | L1 triangle marker | L1 node |
| `lagrange-l2` | Lagrange | L2 triangle marker | L2 node |
| `lagrange-l3` | Lagrange | L3 triangle marker | L3 node |
| `lagrange-l4` | Lagrange | L4 triangle marker | L4 node |
| `lagrange-l5` | Lagrange | L5 triangle marker | L5 node |
| `om-marker` | Orbital Marker | OM dot + short code tag | OM-1..OM-6 around primaries |

## 3) Command and Comms Overlay

| Asset ID | Category | Placeholder | Usage |
|---|---|---|---|
| `comms-net-clear` | Comms | Circular node, cool tone | Healthy comms net |
| `comms-net-degraded` | Comms | Circular node, amber pulse | Degraded net |
| `comms-net-contested` | Comms | Circular node, red pulse | Saturated/contested net |
| `comms-bridge-active` | Comms Link | Dashed cyan link | Active bridge path |
| `comms-bridge-degraded` | Comms Link | Dashed amber link | Degraded bridge |
| `comms-callout-standard` | Callout | Small triangular ping | Standard callout |
| `comms-callout-high` | Callout | Larger triangular ping | High callout |
| `comms-callout-critical` | Callout | Bold triangular ping + core dot | Critical callout |

## 4) Tactical and Operational Marks

| Asset ID | Category | Placeholder | Usage |
|---|---|---|---|
| `op-ao-focus` | Operation | Dashed focus ring | Focus operation AO |
| `op-ao-support` | Operation | Thin AO ring | Supporting op AO |
| `ctrl-zone-neutral` | Control | Soft ring | Low contention zone |
| `ctrl-zone-contested` | Control | Hatched ring | Contested zone |
| `intel-pin` | Intel | Diamond pin | Verified intel pin |
| `intel-marker` | Intel | Triangle marker | Intent marker |
| `intel-note` | Intel | Square note | Context note |
| `risk-band-low` | Risk | Thin arc | Low risk band |
| `risk-band-med` | Risk | Medium arc | Medium risk band |
| `risk-band-high` | Risk | Thick arc | High risk band |

## 5) Logistics and Fleet

| Asset ID | Category | Placeholder | Usage |
|---|---|---|---|
| `logi-corridor` | Logistics | Dotted lane | Movement corridor |
| `logi-convoy` | Logistics | Box train glyph | Convoy route |
| `logi-supply` | Logistics | Crate + arrow | Supply transfer |
| `fleet-capital` | Fleet | Heavy ship silhouette | Capital ship |
| `fleet-support` | Fleet | Wrench shield glyph | Support craft |
| `fleet-rescue` | Fleet | Medical cross shield | Rescue asset |

## 6) Wargame Command UI Kit

| Asset ID | Category | Placeholder | Usage |
|---|---|---|---|
| `hud-grid-rust` | Background | Industrial grid pattern | Basemap texture |
| `hud-scanline-soft` | Background | Horizontal scanline pass | Immersive CRT feel |
| `hud-vignette-ops` | Background | Tactical vignette | Focus mode depth |
| `hud-bracket-target` | Targeting | Corner brackets | Selected node framing |
| `hud-bearing-tick` | Nav | Tick ring | Bearing/range context |
| `hud-threat-chevron` | Alert | Chevron marker | Threat direction |
| `hud-order-chevron` | Command | Command chevron | Task/order cue |
| `hud-audit-stamp` | Audit | Timestamp chip | Event log traceability |

## Styling Direction

- Palette basis: rust/orange/iron/zinc with low-saturation cyan for instrumentation.
- Finishes: matte surfaces, worn-edge highlights, controlled glow.
- Geometry: military stencil + angular notches, avoid soft consumer gradients.
- Motion: sparse and meaningful (traffic flow, degraded pulse, command confirmation flash).
- Accessibility: icon shape + tone + text label redundancy; reduced-motion compatible.
