/**
 * Seed Content Style Guide
 * Generates realistic, "lived-in ops intranet" posts for channel seeding
 * Discipline: tactical language, role-appropriate tone, no generic filler
 */

export const CONTENT_TEMPLATES = {
  // ORG_ANNOUNCEMENTS (BROADCAST only, Founder posts)
  org_announcement: [
    'Reminder: All pilots must complete Q1 certification renewal by EOW. Non-compliant callsigns will lose ops clearance.',
    'NEXUS PROTOCOL UPDATE: New RAID formation doctrine in effect immediately. See pinned briefing for tactical overlay.',
    'Treasury: Weekly dividend distribution processed. Check your balance in the Coffer panel.',
    'System maintenance: Comms infrastructure scheduled for upgrade 2026-01-27 0200 UTC. Expect intermittent connectivity.',
    'Org-wide vote: Channel moderation policy update proposed. Voting opens tomorrow at 0800 UTC.'
  ],

  // ORG_OPS_BRIEFINGS (Scout+ post, threaded)
  ops_brief: [
    {
      title: 'SALVAGE: Derelict UEE Corvette — Stanton II',
      template: `**OPERATION BRIEF**
**AO:** Stanton II — Debris field @ 325k below Crusader
**OBJECTIVE:** Secure cargo modules from UEE Corvette wreck. Estimated value 850k aUEC.
**SQUADS:** Salvage Lead (yourself), 2x Prospectors, 1x Hauler
**TIME WINDOW:** 0600–0900 UTC (tidal window)
**COMMS:** Salvage-net primary, Org-sitrep secondary
**RISK:** Quantum mine field; salvage rights disputed by 3rd party
**RALLY:** Yela Station orbit, vector 180
**EXTRACT:** Crusader Orbital, Bay 4`
    },
    {
      title: 'RESCUE: Distress Call — Microtech Frontier',
      template: `**OPERATION BRIEF**
**AO:** Microtech surface — 45km south of New Babbage
**OBJECTIVE:** Locate crashed Avenger. Pilot and gunner status unknown.
**SQUADS:** Rescue Lead, 2x Combat Medic, 1x Ground Transport
**TIME WINDOW:** ASAP — pilot beacon active for ~90 minutes
**COMMS:** Rescue-net primary, Distress-dispatch secondary
**RISK:** High atmosphere; wildlife; injured crew
**RALLY:** Levski perimeter, clear zone
**EXTRACT:** New Babbage Medical, priority trauma`
    }
  ],

  // ORG_OPS_SITREP (Scout+ post, no replies)
  sitrep_update: [
    'STATUS: Salvage op near complete. Hauler loaded 6 cargo modules, RTB in 12 min.',
    'CONTACT: Two Mantis fighters sighted near Arccorp. No hostile intent. Monitoring.',
    'LOGISTICS: Supply depot restocked with medkits & ammo. All frontline squads at 80%+ readiness.',
    'WEATHER: Solar flare activity elevated. Comms latency up 40ms. Expected to clear in 4 hours.',
    'INCIDENT: Single fighter lost to quantum drive malfunction. Pilot ejected safely, inbound to Crusader.',
    'READINESS: 14 pilots online, 9 craft operational, 3 in maintenance. Ops tempo: nominal.'
  ],

  // ORG_DISTRESS_DISPATCH (Scout+ or Rescue post)
  distress_ticket: [
    {
      title: 'MAYDAY: Freelancer Down — Daymar',
      template: `**DISTRESS TICKET**
**CALLER:** Pilot "Hawk-7" (IFF: 🟢 Org member)
**AO:** Daymar surface — 22km NW of Tumbleweed
**GRID:** [325.4, 156.8, -180]
**THREAT:** None immediate; atmospheric electrical storm rolling in
**INJURIES:** Pilot leg fracture (suspected), gunner minor burns
**COMMS:** On Org-distress-dispatch, radio distorted
**ETA TO RESCUE:** ~15 min (Rescue squad inbound from Levski)
**ASSIGNED:** Rescue-net dispatching 2x medics + transport`
    }
  ],

  // ORG_GENERAL_COMMS (Anyone post, casual)
  general_post: [
    'Finally got my new Gladius painted. Nexus colors looking clean. Meet up at Levski for drinks?',
    'PSA: If your ship is at the docks, move it before tomorrow maintenance window. They will tow.',
    'Upcoming pilot certification exams. Study guide pinned in the ops-briefings channel.',
    'Squad Leaders: Submit weekly readiness reports to treasury by Friday EOD.',
    'Meme thread: worst quantum drive malfunction you've experienced? Go.',
    'Throwback: Remember that time we lost comms for 3 hours and thought we were under attack? Haha.'
  ],

  // ORG_INTEL_LEDGER (Scout+ post, threaded)
  intel_sighting: [
    {
      title: 'Sighting: UEE Carrier Transit — Stanton',
      template: `**INTEL SIGHTING**
**TIME:** 2026-01-23 1432 UTC
**LOC:** Stanton Jump Point approach
**ACTOR:** UEE Javelin-class Carrier + 2x Escort (Hornets)
**COUNT:** 1 capital, 2 escorts, unknown cargo
**HEADING:** Inbound Stanton II
**CONFIDENCE:** High (visual, radar, IFF confirm)
**NOTES:** Unusual routing; suggests supply run or patrol shift change.`
    },
    {
      title: 'Sighting: Pirate Activity — Yela Debris',
      template: `**INTEL SIGHTING**
**TIME:** 2026-01-23 0945 UTC
**LOC:** Yela asteroid field, grid [125, 300]
**ACTOR:** Unknown — 2x Cutlass Black, 1x Hull B (likely salvage)
**COUNT:** 3 ships
**HEADING:** Erratic; possible salvage operation or pirate cache site
**CONFIDENCE:** Medium (FLIR signature only, IFF unknown)
**NOTES:** Recommend reconnaissance before salvage ops in this sector.`
    }
  ],

  // ORG_MARKET_LOGISTICS (Scout+ post, threaded)
  logistics_note: [
    'Trading opportunity: Gold prices at Grim Hex down 18% this morning. Bulk buy before market corrects.',
    'Supply alert: Medical supplies depleted at Grim Hex. Medics, plan resupply accordingly.',
    'Salvage haul incoming: 12 units of refined ore inbound Crusader. Refinery queue at 40%.',
    'Hull insurance renewal due for squad-owned Hammerhead. Finance team processing bulk payment.',
    'New contract: Mining operation for Microtech Industries. 15k aUEC per cycle. See treasury for details.',
    'Shipping manifest: Logistics squad departing for Crusader ore depot. ETA 0800 UTC.'
  ],

  // ROLE-SPECIFIC (Role dispatch channels)
  role_dispatch: [
    {
      role: 'RESCUE',
      posts: [
        'Rescue-net activation: All medics stand by for potential multi-casualty incident.',
        'Protocol reminder: Primary comms on rescue-net; do not split traffic to other channels.',
        'Training: CQB trauma response drills tomorrow 1600 UTC. All personnel required.'
      ]
    },
    {
      role: 'RANGERS',
      posts: [
        'Intel briefing now live in org-intel-ledger. Threat assessment elevated in Stanton II sector.',
        'Patrol assignment: Route A (Crusader orbit), Route B (Yela grid), Route C (Daymar surface).',
        'Rotation complete. Report casualty status and ammo consumption to officers.'
      ]
    },
    {
      role: 'INDUSTRY',
      posts: [
        'Daily market update: Processed metals up 12%, ore down 8%. Adjust refinery output.',
        'Shipping: Hull-D hauler departing for Arccorp refinery. Estimated return 0400 UTC.',
        'Maintenance notice: Mining lasers on prospectors 1 & 3 need coolant flush by tomorrow.'
      ]
    }
  ],

  // SQUAD-SPECIFIC (Squad net channels)
  squad_net: [
    'Squad-wide ops briefing at 1900 UTC. All squad members expected.',
    'Maintenance rotation: 2 ships down for scheduled upkeep. Remaining 4 available for tasking.',
    'Pilot callsign rotation updated. Check squad roster for new assignments.',
    'Discipline notice: Two pilots exceeded speed limit in Crusader airspace. Warning issued.',
    'Supply check: Ammo, fuel, medkits at 90%. Resupply after next operation.'
  ],

  // OPERATION-SPECIFIC (Op brief/live/aar)
  op_brief_content: [
    `**TACTICAL BRIEF: OP-2401-CORSAIR-HUNT**
Objective: Intercept 2x Corsair pirates operating in Stanton II
Squads assigned: Alpha (4 fighters), Bravo (2 fighters, ECM)
Command: Voyager-rank FO
Comms: Op-net primary, Op-sitrep secondary
Contingency: RTB if pilot count drops below 4
Expected duration: 45–90 minutes`
  ],

  op_sitrep: [
    'Alpha squad in combat with 1x Corsair. Bravo flanking. No pilot losses yet.',
    'Corsair 1 disabled, ejecting. Corsair 2 attempting quantum jump. ECM active.',
    'All squads rally point reached. Inbound to extraction zone. ETA 8 minutes.',
    'Operation complete. 2x enemy destroyed, 0 friendly losses. RTB underway.'
  ],

  op_aar: [
    {
      title: 'Op-2401-Corsair-Hunt: After-Action Report',
      template: `**AFTER-ACTION REPORT**
**Operation:** OP-2401-CORSAIR-HUNT
**Result:** SUCCESS — 2x Corsair neutralized, 0 friendly casualties
**Key success factors:** Flanking maneuver by Bravo, ECM suppression of enemy comms
**Lessons learned:** Alpha squad overextended in first engagement; recommend tighter formation discipline
**Recommendations:** Integrate ECM training into pilot certification curriculum
**Treasury impact:** +22,500 aUEC bounty payout distributed`
    }
  ]
};

// Utility: Generate realistic seed content
export const generateSeedPost = (templateKey, overrides = {}) => {
  const templates = CONTENT_TEMPLATES[templateKey];
  if (!templates) return null;

  const template = Array.isArray(templates)
    ? templates[Math.floor(Math.random() * templates.length)]
    : templates;

  return {
    content: typeof template === 'string' ? template : template.template || template.title,
    ...overrides
  };
};

// All templates for seeding validation
export const getAllTemplateKeys = () => Object.keys(CONTENT_TEMPLATES);