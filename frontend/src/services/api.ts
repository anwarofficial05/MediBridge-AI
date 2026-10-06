const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function getToken() { return localStorage.getItem('mb_token'); }

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const controller = options.signal ? null : new AbortController();
  const timeout = controller ? window.setTimeout(() => controller.abort(), 30000) : null;
  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, headers, signal: options.signal || controller?.signal });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && token) {
      localStorage.removeItem('mb_token');
      localStorage.removeItem('mb_user');
      window.dispatchEvent(new Event('mb-auth-expired'));
    }
    if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Request timed out. Please try again.');
    throw error;
  } finally {
    if (timeout !== null) window.clearTimeout(timeout);
  }
}

export async function apiBlob(path: string): Promise<Blob> {
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${API_URL}${path}`, { headers, signal: controller.signal });
    if (response.status === 401 && token) {
      localStorage.removeItem('mb_token');
      localStorage.removeItem('mb_user');
      window.dispatchEvent(new Event('mb-auth-expired'));
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || `Request failed (${response.status})`);
    }
    return response.blob();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Request timed out. Please try again.');
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export { API_URL };
