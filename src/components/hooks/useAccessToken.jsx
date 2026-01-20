// Security: Handle access_token from redirect URL
export function initializeAccessToken() {
  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get('access_token');
  
  if (tokenFromUrl) {
    // Store the token in localStorage
    localStorage.setItem('base44_access_token', tokenFromUrl);
    
    // Remove access_token from URL without reloading
    params.delete('access_token');
    const newSearch = params.toString();
    const newUrl = newSearch 
      ? `${window.location.pathname}?${newSearch}` 
      : window.location.pathname;
    
    window.history.replaceState({}, document.title, newUrl);
  }
}

// Clear token on logout
export function clearAccessToken() {
  localStorage.removeItem('base44_access_token');
}