/**
 * Universal API URL Resolver for Aura Hi-Fi Music
 * Ensures that when the application runs inside an Android WebView (origin: https://localhost)
 * all API requests and downloads connect directly to the live cloud server, preventing
 * net::ERR_CONNECTION_REFUSED errors.
 */

export const CLOUD_SERVER_URL = 'https://ais-dev-jzugozisvqqdczqo2euymb-957426344434.europe-west2.run.app';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const proto = window.location.protocol;
    
    // Check if user set a custom server in localStorage
    const savedServer = localStorage.getItem('aura_custom_server_url');
    if (savedServer) {
      return savedServer.replace(/\/+$/, '');
    }

    // When inside Android WebView (localhost, 127.0.0.1, androidplatform.net) or file:
    if (
      !host || 
      host === 'localhost' || 
      host === '127.0.0.1' || 
      host.includes('androidplatform.net') || 
      proto === 'file:'
    ) {
      return CLOUD_SERVER_URL;
    }
    
    return window.location.origin;
  }
  return CLOUD_SERVER_URL;
}

export function apiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${clean}`;
}
