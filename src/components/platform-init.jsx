// CRITICAL: Platform initialization - must be imported FIRST everywhere
const fallback = () => false;

if (typeof globalThis !== 'undefined') {
  globalThis.persistDemoFromUrl = fallback;
}
if (typeof window !== 'undefined') {
  window.persistDemoFromUrl = fallback;
}
if (typeof self !== 'undefined') {
  self.persistDemoFromUrl = fallback;
}

export default fallback;