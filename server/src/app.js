import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.clientUrl }));
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ ok: true });
});

app.use((request, response) => {
  response.status(404).json({ message: `Route not found: ${request.method} ${request.path}` });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ message: 'Something went wrong. Please try again.' });
});

