const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export async function apiRequest(path, { token, body, ...options } = {}) {
  const headers = { ...options.headers };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new Error('Could not reach Sweety. Check that the server is running.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message ?? 'Something went wrong. Please try again.');
  return data;
}

