import { execFileSync } from "node:child_process";
import { GoogleAuth } from "google-auth-library";

export const AGENT_URL = (process.env.AGENT_URL ?? "http://localhost:8080").replace(/\/$/, "");
export const APP_NAME = process.env.AGENT_APP_NAME ?? "kg_agent";

let auth: GoogleAuth | undefined;

/**
 * Authorization header for the kg-agent Cloud Run service.
 * - On Cloud Run the service account mints an ID token for the agent URL (audience).
 * - Locally, user ADC cannot mint ID tokens, so fall back to `gcloud auth print-identity-token`.
 * - A localhost agent needs no auth.
 */
export async function agentAuthHeaders(): Promise<Record<string, string>> {
  if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(AGENT_URL) || process.env.AGENT_AUTH === "none") return {};
  if (process.env.AGENT_ID_TOKEN) return { Authorization: `Bearer ${process.env.AGENT_ID_TOKEN}` };
  try {
    auth ??= new GoogleAuth();
    const client = await auth.getIdTokenClient(AGENT_URL);
    const headers = await client.getRequestHeaders();
    const value =
      headers instanceof Headers
        ? headers.get("authorization")
        : ((headers as Record<string, string>).Authorization ?? (headers as Record<string, string>).authorization);
    if (value) return { Authorization: value };
  } catch {
    // fall through to gcloud
  }
  const token = execFileSync(/*turbopackIgnore: true*/ process.env.GCLOUD_BIN ?? "gcloud", ["auth", "print-identity-token"], { encoding: "utf8" }).trim();
  return { Authorization: `Bearer ${token}` };
}

const knownSessions = new Set<string>();

/** Create the ADK session if this server instance has not seen it yet (idempotent on the agent side). */
export async function ensureSession(userId: string, sessionId: string, headers: Record<string, string>) {
  const key = `${userId}/${sessionId}`;
  if (knownSessions.has(key)) return;
  const res = await fetch(`${AGENT_URL}/apps/${APP_NAME}/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(sessionId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: "{}",
  });
  // 200 created, 400/409 already exists: both fine
  if (res.ok || res.status === 400 || res.status === 409) knownSessions.add(key);
  else throw new Error(`session create failed: ${res.status} ${await res.text()}`);
}
