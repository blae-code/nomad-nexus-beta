import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

function getDefaultMembershipForRank(rank: string | null | undefined) {
  const normalized = (rank || '').toString().toUpperCase();
  switch (normalized) {
    case 'SCOUT':
      return 'MEMBER';
    case 'VOYAGER':
      return 'AFFILIATE';
    case 'FOUNDER':
    case 'PIONEER':
      return 'PARTNER';
    case 'VAGRANT':
      return 'VAGRANT';
    default:
      return null;
  }
}

function getMembershipLabel(membership: string | null | undefined) {
  const normalized = (membership || '').toString().toUpperCase();
  const labels: Record<string, string> = {
    GUEST: 'Guest',
    VAGRANT: 'Prospect',
    PROSPECT: 'Prospect',
    MEMBER: 'Member',
    AFFILIATE: 'Affiliate',
    PARTNER: 'Partner',
  };
  return labels[normalized] || membership || '';
}

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { actorType, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true
    });
    const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);
    if (!isAdmin) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { accessKeyCode, accessKeyRank, accessKeyMembership, grantsMembership, appUrl = 'https://nomadnexus.space' } = payload;

    if (!accessKeyCode) {
      return Response.json({ error: 'Access key code required' }, { status: 400 });
    }

    const inviteUrl = `${appUrl}/access-gate?key=${encodeURIComponent(accessKeyCode)}`;
    const membership = accessKeyMembership || grantsMembership || getDefaultMembershipForRank(accessKeyRank);
    const membershipLabel = getMembershipLabel(membership);

    // Discord rich embed JSON format
    const discordEmbed = {
      title: '⚔️ You\'ve Been Invited to Nomad Nexus',
      description: 'Join our operations hub for Star Citizen. Get authorized access and start your journey.',
      color: 0xea580c, // Orange accent color
      fields: [
        {
          name: '🎖️ Granted Rank',
          value: `**${accessKeyRank || 'VAGRANT'}**`,
          inline: true
        },
        ...(membershipLabel ? [{
          name: '🛡️ Membership Tier',
          value: `**${membershipLabel}**`,
          inline: true
        }] : []),
        {
          name: '📋 Access Key',
          value: `\`\`\`${accessKeyCode}\`\`\``,
          inline: false
        }
      ],
      thumbnail: {
        url: 'https://nomadnexus.space/nexus-icon.png'
      },
      footer: {
        text: 'Nomad Nexus Operations Hub'
      }
    };

    // Plain text version for easy copying
    const membershipLine = membershipLabel ? `\n🛡️ Membership Tier: **${membershipLabel}**\n` : '\n';
    const plainText = `⚔️ You've Been Invited to Nomad Nexus

Join our operations hub for Star Citizen. Get authorized access and start your journey.

🎖️ Granted Rank: **${accessKeyRank || 'VAGRANT'}**
${membershipLine}
📋 Access Key: ${accessKeyCode}

🔗 Quick Access: ${inviteUrl}

---
Click the link above to redeem your access key and begin your onboarding. Questions? Reach out to command.

Nomad Nexus Operations Hub`;

    // Markdown version for Discord
    const membershipSection = membershipLabel ? `\n## 🛡️ Membership Tier\n**${membershipLabel}**\n` : '\n';
    const markdownVersion = `# ⚔️ You've Been Invited to Nomad Nexus

Join our operations hub for Star Citizen. Get authorized access and start your journey.

## 🎖️ Granted Rank
**${accessKeyRank || 'VAGRANT'}**
${membershipSection}
## 📋 Access Key
\`\`\`
${accessKeyCode}
\`\`\`

## 🔗 Quick Access
[Enter Nomad Nexus](${inviteUrl})

---
Click the link above to redeem your access key and begin your onboarding. Questions? Reach out to command.`;

    return Response.json({
      success: true,
      accessKey: accessKeyCode,
      grantedRank: accessKeyRank,
      grantedMembership: membership,
      inviteUrl,
      discord: {
        embed: discordEmbed,
        markdown: markdownVersion,
        plainText
      }
    });
  } catch (error) {
    console.error('generateDiscordInvitation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
