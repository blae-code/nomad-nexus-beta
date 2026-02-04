import { base44 } from '@/api/base44Client';

function getMemberToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('nexus.login.token');
}

export async function invokeMemberFunction(name, payload = {}, options = {}) {
  const body = { ...(payload || {}) };
  const token = getMemberToken();

  if (token && !body.memberToken && !body.member_token && !body.memberSession && !body.sessionToken) {
    body.memberToken = token;
  }

  return base44.functions.invoke(name, body, options);
}
