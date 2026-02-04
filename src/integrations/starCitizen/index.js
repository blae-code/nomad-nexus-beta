export async function getPlayerStatus() {
  return { configured: false, message: 'Star Citizen API not configured yet.' };
}

export async function getOrgAssets() {
  return { configured: false, message: 'Star Citizen API not configured yet.' };
}

export async function getOrgInventory() {
  return { configured: false, message: 'Star Citizen API not configured yet.' };
}

export async function syncStarCitizenData() {
  return { configured: false, message: 'Star Citizen API sync not available.' };
}

export default {
  getPlayerStatus,
  getOrgAssets,
  getOrgInventory,
  syncStarCitizenData,
};
