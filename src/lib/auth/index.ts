// Auth facade — replaced with the real Auth.js v5 implementation in Phase 5.
// Until then there are no sessions, so auth() always resolves to null.

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EDITOR";
};

export type Session = { user: SessionUser } | null;

export async function auth(): Promise<Session> {
  return null;
}
