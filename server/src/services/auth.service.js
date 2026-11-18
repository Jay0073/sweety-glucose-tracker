import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';
import { ApiError } from '../utils/ApiError.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function createToken(user) {
  return jwt.sign(
    { sub: String(user.id), email: user.email },
    env.jwtSecret,
    { expiresIn: '7d' }
  );
}

export async function register({ name, email, password }) {
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!cleanName) throw new ApiError(400, 'Please enter your name.');
  if (!EMAIL_PATTERN.test(cleanEmail)) throw new ApiError(400, 'Please enter a valid email address.');
  if (typeof password !== 'string' || password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters.');
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
  if (existing.rowCount) throw new ApiError(409, 'An account with this email already exists.');

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [cleanName, cleanEmail, passwordHash]
    );
    const user = publicUser(result.rows[0]);
    return { user, token: createToken(user) };
  } catch (error) {
    if (error.code === '23505') {
      throw new ApiError(409, 'An account with this email already exists.');
    }
    throw error;
  }
}

export async function login({ email, password }) {
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!EMAIL_PATTERN.test(cleanEmail) || typeof password !== 'string' || !password) {
    throw new ApiError(401, 'Email or password is incorrect.');
  }

  const result = await pool.query(
    'SELECT id, name, email, password_hash FROM users WHERE email = $1',
    [cleanEmail]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new ApiError(401, 'Email or password is incorrect.');
  }

  const safeUser = publicUser(user);
  return { user: safeUser, token: createToken(safeUser) };
}

export async function getUserById(userId) {
  const result = await pool.query(
    'SELECT id, name, email FROM users WHERE id = $1',
    [userId]
  );
  if (!result.rowCount) throw new ApiError(401, 'Your session is no longer valid.');
  return publicUser(result.rows[0]);
}

