import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { digest, passwordHash } from "../../../lib/game/account";

export const dynamic = "force-dynamic";

function reply(data: unknown, status = 200, cookie?: string) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(cookie ? { "Set-Cookie": cookie } : {}),
    },
  });
}
function validOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
function sameSecret(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  let delta = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++)
    delta |= (ea[i] || 0) ^ (eb[i] || 0);
  return delta === 0;
}
export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user) return reply({ account: null, passwordLoginEnabled: true }, 401);
    return reply({ account: { username: user.displayName }, passwordLoginEnabled: true });
  } catch {
    return reply({ error: "帳號暫時無法載入" }, 503);
  }
}
export async function POST(request: Request) {
  if (!validOrigin(request)) return reply({ error: "來源不符" }, 403);
  if (!env.DB) return reply({ error: "測試資料庫未連接" }, 503);
  let input: Record<string, unknown>;
  try { input = await request.json() as Record<string, unknown>; }
  catch { return reply({ error: "資料格式錯誤" }, 400); }

  try {
    if (input.logout === true) {
      const token = (await import("next/headers")).cookies;
      const session = (await token()).get("game_session")?.value;
      if (session) await env.DB.prepare(
        "UPDATE game_accounts SET session_hash=NULL, session_until=0 WHERE session_hash=?"
      ).bind(await digest(session)).run();
      return reply({ ok: true }, 200,
        "game_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0");
    }

    const username = String(input.username || "").trim();
    const password = String(input.password || "");
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username) ||
        password.length < 8 || password.length > 128)
      return reply({ error: "帳號限 3–24 位英數或底線，密碼需 8–128 字" }, 400);
    const owner = "standalone:" + username.toLowerCase();
    let row = await env.DB.prepare(
      "SELECT owner,username,salt,password_hash,failed,blocked_until FROM game_accounts WHERE owner=?"
    ).bind(owner).first<{
      owner:string;username:string;salt:string;password_hash:string;
      failed:number;blocked_until:number;
    }>();

    if (input.register === true) {
      if (row) return reply({ error: "此帳號已建立，請改用登入" }, 409);
      const salt = crypto.randomUUID();
      await env.DB.prepare(
        "INSERT INTO game_accounts (owner,username,salt,password_hash) VALUES (?,?,?,?)"
      ).bind(owner,username,salt,await passwordHash(password,salt)).run();
    } else {
      if (!row) return reply({ error: "帳號或密碼錯誤" }, 401);
      if (row.blocked_until > Date.now())
        return reply({ error: "登入嘗試次數過多，請稍後再試" }, 429);
      const hash = await passwordHash(password,row.salt);
      if (username.toLowerCase() !== row.username.toLowerCase() ||
          !sameSecret(hash,row.password_hash)) {
        const failures = row.failed + 1;
        await env.DB.prepare(
          "UPDATE game_accounts SET failed=?, blocked_until=? WHERE owner=?"
        ).bind(failures,failures % 5 === 0 ? Date.now()+300000 : 0,owner).run();
        return reply({ error: "帳號或密碼錯誤" }, 401);
      }
    }

    const session = crypto.randomUUID() + crypto.randomUUID();
    const seconds = input.remember === true ? 2592000 : 43200;
    await env.DB.prepare(
      "UPDATE game_accounts SET session_hash=?,session_until=?,failed=0,blocked_until=0 WHERE owner=?"
    ).bind(await digest(session),Date.now()+seconds*1000,owner).run();
    return reply({ account:{username} },200,
      `game_session=${session}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${seconds}`);
  } catch (error) {
    console.error("test account error",error);
    return reply({ error: "測試帳號服務暫時無法使用" },503);
  }
}
