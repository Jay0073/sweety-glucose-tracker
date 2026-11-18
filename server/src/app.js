import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.routes.js';
import { readingsRouter } from './routes/readings.routes.js';
import { reportsRouter } from './routes/reports.routes.js';
import { ApiError } from './utils/ApiError.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.clientUrl }));
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/readings', readingsRouter);
app.use('/api/reports', reportsRouter);

app.use((request, response) => {
  response.status(404).json({ message: `Route not found: ${request.method} ${request.path}` });
});

app.use((error, _request, response, _next) => {
  if (error instanceof ApiError) {
    return response.status(error.status).json({ message: error.message });
  }
  if (error instanceof SyntaxError && 'body' in error) {
    return response.status(400).json({ message: 'The request body is not valid JSON.' });
  }
  console.error(error);
  return response.status(500).json({ message: 'Something went wrong. Please try again.' });
});

