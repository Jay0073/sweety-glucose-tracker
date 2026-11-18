import * as authService from '../services/auth.service.js';

export async function register(request, response) {
  const result = await authService.register(request.body ?? {});
  response.status(201).json(result);
}

export async function login(request, response) {
  const result = await authService.login(request.body ?? {});
  response.json(result);
}

export async function me(request, response) {
  const user = await authService.getUserById(request.user.id);
  response.json({ user });
}

