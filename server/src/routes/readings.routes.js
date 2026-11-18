import { Router } from 'express';
import * as readingsController from '../controllers/readings.controller.js';
import { authenticate } from '../middleware/authenticate.js';

export const readingsRouter = Router();

readingsRouter.use(authenticate);
readingsRouter.get('/', readingsController.list);
readingsRouter.post('/', readingsController.create);
readingsRouter.patch('/:id', readingsController.update);
readingsRouter.delete('/:id', readingsController.remove);

