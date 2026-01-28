import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export function isIframe() {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.self !== window.top;
}
