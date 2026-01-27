// CRITICAL: This must be imported FIRST in pages.config.js
// Base44 platform initialization - define legacy hooks before SDK loads

if (typeof window !== "undefined") {
  // Define persistDemoFromUrl fallback
  if (typeof window.persistDemoFromUrl !== "function") {
    window.persistDemoFromUrl = () => false;
  }
  
  // Mark as initialized
  window.__platformHooksInitialized = true;
}