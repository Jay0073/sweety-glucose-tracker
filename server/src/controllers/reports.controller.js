import { getReport } from '../services/reports.service.js';

export async function show(request, response) {
  const report = await getReport(request.user.id, request.params.type, request.query.date);
  response.json({ report });
}

