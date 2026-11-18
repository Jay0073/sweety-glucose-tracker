import * as readingsService from '../services/readings.service.js';

export async function list(request, response) {
  const result = await readingsService.listReadings(request.user.id, request.query);
  response.json(result);
}

export async function create(request, response) {
  const reading = await readingsService.createReading(request.user.id, request.body ?? {});
  response.status(201).json({ reading });
}

export async function update(request, response) {
  const reading = await readingsService.updateReading(request.user.id, request.params.id, request.body ?? {});
  response.json({ reading });
}

export async function remove(request, response) {
  await readingsService.deleteReading(request.user.id, request.params.id);
  response.status(204).send();
}

