import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function authenticate(request, _response, next) {
  const [scheme, token] = (request.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Please log in to continue.'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    request.user = { id: Number(payload.sub), email: payload.email };
    return next();
  } catch {
    return next(new ApiError(401, 'Your session has expired. Please log in again.'));
  }
}

