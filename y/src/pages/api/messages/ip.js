export const prerender = false;

import { getRequestIp } from '../../../lib/postgres.js';

export async function GET(context) {
  const request = context?.request ?? context;
  const ip = getRequestIp(request);

  return new Response(
    JSON.stringify({ ip }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
