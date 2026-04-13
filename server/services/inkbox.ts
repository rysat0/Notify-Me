import { Inkbox, type AgentIdentity } from "@inkbox/sdk";
import type { UserConfig, BriefingResponse, InkboxStatus } from "../../shared/types.js";

let inkboxClient: Inkbox | null = null;
let identity: AgentIdentity | null = null;

export async function initInkbox(apiKey: string, handle: string): Promise<InkboxStatus> {
  try {
    inkboxClient = new Inkbox({ apiKey });

    // Try to get existing identity, create if not found
    try {
      identity = await inkboxClient.getIdentity(handle);
    } catch {
      identity = await inkboxClient.createIdentity(handle);
    }

    console.log(`Inkbox identity ready: ${identity.emailAddress}`);
    return {
      connected: true,
      identityHandle: identity.agentHandle,
      emailAddress: identity.emailAddress || null,
    };
  } catch (err) {
    console.error("Inkbox init failed:", err);
    inkboxClient = null;
    identity = null;
    return { connected: false, identityHandle: null, emailAddress: null };
  }
}

export async function sendBriefingEmail(
  briefing: BriefingResponse,
  settings: UserConfig
): Promise<void> {
  if (!identity || !settings.deliveryEmail) return;

  const articleHtml = briefing.articles
    .map(
      (a) => `
      <div style="margin-bottom:20px;padding:16px;border:1px solid #333;border-radius:8px;background:#1a1a2e;">
        <h3 style="margin:0 0 8px;color:#e2e8f0;">${a.title}</h3>
        <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">
          ${a.source} · ${a.category}${a.isFollowUp ? ' <span style="background:#78350f;color:#fbbf24;padding:2px 6px;border-radius:4px;font-size:11px;">Follow-up</span>' : ""}
        </p>
        <p style="margin:8px 0;color:#cbd5e1;">${a.summary}</p>
        ${a.sourceUrl ? `<a href="${a.sourceUrl}" style="color:#60a5fa;font-size:12px;">Read source →</a>` : ""}
      </div>`
    )
    .join("");

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px;border-radius:12px;">
      <h1 style="font-size:24px;margin:0 0 4px;">
        <span style="color:#3b82f6;">Notify</span> Me — Daily Briefing
      </h1>
      <p style="font-size:12px;color:#64748b;margin:0 0 20px;">
        ${new Date(briefing.generatedAt).toLocaleDateString()} · ${briefing.articles.length} articles
      </p>
      <div style="padding:16px;background:#1e293b;border-radius:8px;margin-bottom:20px;">
        <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin:0 0 8px;">Summary</h2>
        <p style="margin:0;line-height:1.6;color:#e2e8f0;">${briefing.summary}</p>
      </div>
      ${articleHtml}
      <p style="font-size:11px;color:#475569;margin-top:24px;text-align:center;">
        Reply to this email with commands: "generate", "categories tech ai", "language ja"
      </p>
    </div>
  `;

  await identity.sendEmail({
    to: [settings.deliveryEmail],
    subject: `Notify Me Briefing — ${new Date().toLocaleDateString()}`,
    bodyText: `${briefing.summary}\n\n${briefing.articles.map((a) => `${a.title}\n${a.summary}`).join("\n\n")}`,
    bodyHtml: html,
  });

  console.log(`Briefing email sent to ${settings.deliveryEmail}`);
}

export function getInkboxStatus(): InkboxStatus {
  return {
    connected: identity !== null,
    identityHandle: identity?.agentHandle || null,
    emailAddress: identity?.emailAddress || null,
  };
}

export function getIdentity(): AgentIdentity | null {
  return identity;
}

export function getInkboxClient(): Inkbox | null {
  return inkboxClient;
}
