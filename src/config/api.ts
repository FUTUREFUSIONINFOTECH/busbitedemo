const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  'https://busbitedemo.onrender.com'
).replace(/\/$/, '');

export const API_URL = `${API_BASE_URL}/api`;

export const WS_URL = API_BASE_URL
  .replace(/^https:/, 'wss:')
  .replace(/^http:/, 'ws:');

export function getApiUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${API_BASE_URL}/${url.replace(/^\/+/, '')}`;
}