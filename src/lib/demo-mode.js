// src/lib/demo-mode.js
export function isDemoMode() {
  if (typeof window === 'undefined') return false;

  const host = window.location.hostname || '';
  const search = window.location.search || '';

  // Demo mode triggers:
  // - explicit query flag
  // - local dev hostnames
  return (
    search.includes('demo=true') ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.local')
  );
}
/**
 * Demo mode helpers.
 * Must never throw if window/localStorage isn't available.
 */

export function isDemoMode() {
  // Vite env toggle (safe if not available)
  try {
    const v = import.meta?.env?.VITE_DEMO_MODE;
    if (typeof v === "string" && v.toLowerCase() === "true") return true;
    if (v === true) return true;
  } catch {}

  if (typeof window === "undefined") return false;

  // URL param toggle
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("demo") === "true") return true;
    if (url.searchParams.get("demoMode") === "true") return true;
  } catch {}

  // localStorage toggle
  try {
    return window.localStorage.getItem("demoMode") === "true";
  } catch {
    return false;
  }
}

export function setDemoMode(value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("demoMode", value ? "true" : "false");
  } catch {}
}

export function persistDemoFromUrl() {
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(window.location.href);
    const demo = url.searchParams.get("demo") === "true" || url.searchParams.get("demoMode") === "true";
    if (demo) setDemoMode(true);
    return demo;
  } catch {
    return false;
  }
}
