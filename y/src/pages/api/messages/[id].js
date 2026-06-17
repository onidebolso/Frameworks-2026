export const prerender = false;

import { getRequestIp, pool } from '../../../lib/postgres.js';

function jsonError(message, status = 500) {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function PATCH({ params, request }) {
  try {
    const id = Number(params.id);

    if (!Number.isInteger(id)) {
      return jsonError('ID invalido.', 400);
    }

    const payload = await request.json().catch(() => ({}));
    const field = payload?.field;

    if (field !== 'likes' && field !== 'dislikes') {
      return jsonError('Campo invalido para atualizacao.', 400);
    }

    const { rows } = await pool.query(
      `
        UPDATE public.messages
        SET ${field} = ${field} + 1
        WHERE id = $1
        RETURNING *
      `,
      [id]
    );

    if (!rows[0]) {
      return jsonError('Mensagem nao encontrada.', 404);
    }

    return new Response(JSON.stringify(rows[0]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return jsonError(error.message || 'Nao foi possivel atualizar a mensagem.', 500);
  }
}

export async function DELETE({ params, request }) {
  try {
    const id = Number(params.id);

    if (!Number.isInteger(id)) {
      return jsonError('ID invalido.', 400);
    }

    const authorIp = getRequestIp(request);

    const existing = await pool.query(
      'SELECT author_ip FROM public.messages WHERE id = $1',
      [id]
    );

    if (!existing.rows[0]) {
      return jsonError('Mensagem nao encontrada.', 404);
    }

    if (existing.rows[0].author_ip !== authorIp) {
      return jsonError('Apenas o criador pode excluir esta mensagem.', 403);
    }

    const { rows } = await pool.query(
      'DELETE FROM public.messages WHERE id = $1 RETURNING *',
      [id]
    );

    return new Response(JSON.stringify(rows[0] || null), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return jsonError(error.message || 'Nao foi possivel excluir a mensagem.', 500);
  }
}
