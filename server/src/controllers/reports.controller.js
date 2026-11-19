import { getComparison, getReport } from '../services/reports.service.js';

export async function show(request, response) {
  const report = await getReport(request.user.id, request.params.type, request.query.date);
  response.json({ report });
}

export async function compare(request, response) {
  const report = await getComparison(request.user.id, request.query);
  response.json({ report });
}

