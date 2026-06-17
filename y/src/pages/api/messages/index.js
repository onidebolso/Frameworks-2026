export const prerender = false;

import { getRequestIp, pool } from '../../../lib/postgres.js';

function jsonError(message, status = 500) {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(context) {
  try {
    const { rows } = await pool.query(
      `
        SELECT
          id,
          text,
          emoji,
          author_name,
          author_ip,
          latitude,
          longitude,
          x,
          y,
          likes,
          dislikes,
          created_at
        FROM public.messages
        ORDER BY created_at ASC
      `
    );

    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return jsonError(error.message || 'Nao foi possivel buscar as mensagens.');
  }
}

export async function POST(context) {
  try {
    const request = context?.request ?? context;
    const payload = await request.json().catch(() => ({}));
    const text = payload?.text?.trim();

    if (!text) {
      return jsonError('Escreva uma mensagem antes de salvar.', 400);
    }

    const authorIp = getRequestIp(request) || 'unknown';
    const emoji = payload?.emoji?.trim() || '💬';
    const authorName = payload?.author_name?.trim() || null;
    const latitude = payload?.latitude ?? null;
    const longitude = payload?.longitude ?? null;
    const x = payload?.x ?? -1;
    const y = payload?.y ?? -1;

    const { rows } = await pool.query(
      `
        INSERT INTO public.messages (
          text,
          emoji,
          author_name,
          author_ip,
          latitude,
          longitude,
          x,
          y,
          likes,
          dislikes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0)
        RETURNING *
      `,
      [text, emoji, authorName, authorIp, latitude, longitude, x, y]
    );

    return new Response(JSON.stringify(rows[0]), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return jsonError(error.message || 'Nao foi possivel salvar a mensagem.', 500);
  }
}
