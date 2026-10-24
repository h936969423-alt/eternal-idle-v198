import { cookies } from "next/headers";
import { env } from "cloudflare:workers";
import { redirect } from "next/navigation";
import { digest } from "@/lib/game/account";

export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

// Standalone test: authenticate solely by an unforgeable server-side D1 session.
// Never trust user-supplied oai-authenticated-user-* headers on a public Worker.
export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const token = (await cookies()).get("game_session")?.value;
  if (!token || !/^[a-f0-9-]{60,100}$/i.test(token) || !env.DB) return null;
  const row = await env.DB.prepare(
    "SELECT owner, username FROM game_accounts WHERE session_hash=? AND session_until>? LIMIT 1"
  ).bind(await digest(token), Date.now()).first<{owner:string;username:string}>();
  if (!row) return null;
  return {
    userId: row.owner,
    displayName: row.username,
    email: row.username + "@eternal.invalid",
    fullName: row.username,
  };
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(_returnTo: string): string {
  return "/";
}

export function chatGPTSignOutPath(_returnTo = "/"): string {
  return "/";
}
