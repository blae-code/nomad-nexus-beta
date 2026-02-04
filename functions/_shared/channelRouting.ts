type RoutingRule = {
  id: string;
  tag: string;
  targetChannelNames: string[];
};

const DEFAULT_ROUTING_RULES: RoutingRule[] = [
  { id: 'ops', tag: '#ops', targetChannelNames: ['ops', 'operations'] },
  { id: 'intel', tag: '#intel', targetChannelNames: ['intel', 'intelligence'] },
  { id: 'logistics', tag: '#logi', targetChannelNames: ['logi', 'logistics'] },
  { id: 'command', tag: '#command', targetChannelNames: ['command'] },
];

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase();
}

export function extractRouteTags(content: string): string[] {
  if (!content || typeof content !== 'string') return [];
  const matches = content.match(/#[a-zA-Z0-9_-]{2,32}/g) || [];
  return Array.from(new Set(matches.map((m) => normalizeTag(m))));
}

export async function getRoutingRules(base44: any): Promise<RoutingRule[]> {
  try {
    const rules = await base44.asServiceRole.entities.ChannelRoutingRule.list?.();
    if (Array.isArray(rules) && rules.length > 0) {
      return rules
        .map((rule) => ({
          id: rule.id || rule.tag,
          tag: normalizeTag(rule.tag || ''),
          targetChannelNames: (rule.target_channel_names || []).map((name: string) => name.toLowerCase()),
        }))
        .filter((rule) => rule.tag && rule.targetChannelNames.length > 0);
    }
  } catch {
    // ignore missing entity or errors
  }
  return DEFAULT_ROUTING_RULES;
}

export function resolveTargetNames(tags: string[], rules: RoutingRule[]) {
  const resolved = new Set<string>();
  tags.forEach((tag) => {
    const rule = rules.find((r) => r.tag === normalizeTag(tag));
    if (rule) {
      rule.targetChannelNames.forEach((name) => resolved.add(name.toLowerCase()));
    }
  });
  return Array.from(resolved);
}
