export interface ApiError {
  error: string | Array<{ message: string; path: string[] }>;
}

const API_BASE = '/api';

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('brahmi_auth_token');
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('brahmi_auth_token');
      // Dispatch an event to notify stores
      window.dispatchEvent(new Event('brahmi-unauthorized'));
    }
    
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: 'An unknown server error occurred' };
    }
    
    throw new Error(
      typeof errorData.error === 'string'
        ? errorData.error
        : JSON.stringify(errorData.error)
    );
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: RequestInit) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
    
  post: <T>(path: string, body: any, options?: RequestInit) =>
    apiRequest<T>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    }),
    
  put: <T>(path: string, body: any, options?: RequestInit) =>
    apiRequest<T>(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),
    
  delete: <T>(path: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(path, {
      ...options,
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    }),
};
