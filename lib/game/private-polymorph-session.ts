import { digest } from './account';

export async function ownsPrivatePolymorphSession(request: Request, db?: D1Database, owner?: string) {
  if (!db || !owner?.trim()) return false;
  const cookies = (request.headers.get('cookie') ?? '').split(';').map(cookie => cookie.trim());
  const sessions = cookies.filter(cookie => cookie.startsWith('game_session='));
  if (sessions.length !== 1) return false;
  const token = sessions[0].slice('game_session='.length);
  if (!/^[a-f0-9-]{60,100}$/i.test(token)) return false;
  const row = await db.prepare(
    'SELECT 1 FROM game_accounts WHERE owner=? AND session_hash=? AND session_until>? LIMIT 1'
  ).bind(owner, await digest(token), Date.now()).first();
  return row !== null;
}
