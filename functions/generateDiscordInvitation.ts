import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { accessKeyCode, accessKeyRank, appUrl = 'https://nomadnexus.space' } = payload;

    if (!accessKeyCode) {
      return Response.json({ error: 'Access key code required' }, { status: 400 });
    }

    const inviteUrl = `${appUrl}/access-gate?key=${encodeURIComponent(accessKeyCode)}`;

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
    const plainText = `⚔️ You've Been Invited to Nomad Nexus

Join our operations hub for Star Citizen. Get authorized access and start your journey.

🎖️ Granted Rank: **${accessKeyRank || 'VAGRANT'}**

📋 Access Key: ${accessKeyCode}

🔗 Quick Access: ${inviteUrl}

---
Click the link above to redeem your access key and begin your onboarding. Questions? Reach out to command.

Nomad Nexus Operations Hub`;

    // Markdown version for Discord
    const markdownVersion = `# ⚔️ You've Been Invited to Nomad Nexus

Join our operations hub for Star Citizen. Get authorized access and start your journey.

## 🎖️ Granted Rank
**${accessKeyRank || 'VAGRANT'}**

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