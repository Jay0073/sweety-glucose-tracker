import { Router } from 'express';
import { compare, show } from '../controllers/reports.controller.js';
import { authenticate } from '../middleware/authenticate.js';

export const reportsRouter = Router();

reportsRouter.use(authenticate);
reportsRouter.get('/compare', compare);
reportsRouter.get('/:type', show);

