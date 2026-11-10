// send-email — envoi des e-mails EconGlobe (Gmail ou Resend), côté serveur.
//
// Le navigateur ne choisit jamais librement le destinataire :
//   • "admin_notification" → toujours vers ADMIN_EMAIL (ouvert à tous, y compris
//     un visiteur qui vient de s'inscrire sans session)
//   • "welcome"            → uniquement vers l'adresse du compte connecté
//   • "user_message"       → destinataire libre, réservé au compte admin
//
// Fournisseur d'envoi (Supabase → Edge Functions → Secrets) :
//   • Resend, si RESEND_API_KEY est défini (+ RESEND_FROM, domaine vérifié)
//   • sinon Gmail SMTP : GMAIL_USER + GMAIL_APP_PASSWORD (mot de passe d'application)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const ADMIN_EMAIL = "econglobe26@gmail.com";
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 6000;

type EmailType = "admin_notification" | "welcome" | "user_message";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD");
    if (!resendKey && !(gmailUser && gmailPass)) return json({ error: "Email service not configured" }, 500);

    const body = await req.json().catch(() => ({}));
    const type = String(body?.type || "") as EmailType;
    const subject = clean(body?.subject, MAX_SUBJECT);
    const message = String(body?.message ?? "").slice(0, MAX_MESSAGE);
    if (!subject || !message.trim()) return json({ error: "Missing subject or message" }, 400);

    const caller = await getCaller(req);
    let to: string;

    switch (type) {
      case "admin_notification":
        to = ADMIN_EMAIL;
        break;
      case "welcome":
        if (!caller?.email) return json({ error: "Unauthorized" }, 401);
        to = caller.email;
        break;
      case "user_message": {
        if (!isAdmin(caller)) return json({ error: "Forbidden" }, 403);
        to = String(body?.to || "").trim().toLowerCase();
        if (!/^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(to)) return json({ error: "Invalid recipient" }, 400);
        break;
      }
      default:
        return json({ error: "Unknown email type" }, 400);
    }

    // Une notification admin peut contenir un e-mail de contact (proposition) :
    // on le met en Reply-To pour pouvoir répondre directement.
    const replyTo = type === "admin_notification" && isEmail(body?.reply_to)
      ? String(body.reply_to).trim()
      : ADMIN_EMAIL;

    // Nom affiché « Envoyé par » : celui de l'auteur d'une proposition pour les
    // notifications admin, sinon EconGlobe.
    const fromName = type === "admin_notification" ? (clean(body?.from_name, 100) || "EconGlobe") : "EconGlobe";
    const mail = { to, replyTo, subject, text: message, html: toHtml(message, subject, fromName, replyTo) };
    if (resendKey) {
      await sendWithResend(resendKey, Deno.env.get("RESEND_FROM") ?? "EconGlobe <onboarding@resend.dev>", mail);
    } else {
      await sendWithGmail(gmailUser!, gmailPass!, mail);
    }
    return json({ ok: true }, 200);
  } catch (error) {
    console.error("send-email failed:", error instanceof Error ? error.message : error);
    return json({ error: "Email provider error" }, 502);
  }
});

type Mail = { to: string; replyTo: string; subject: string; text: string; html: string };

async function sendWithResend(apiKey: string, from: string, m: Mail) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [m.to], reply_to: m.replyTo, subject: m.subject, text: m.text, html: m.html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

async function sendWithGmail(user: string, pass: string, m: Mail) {
  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: user, password: pass.replace(/\s+/g, "") },
    },
  });
  try {
    await client.send({
      from: `EconGlobe <${user}>`,
      to: m.to,
      replyTo: m.replyTo,
      subject: m.subject,
      content: m.text,
      html: m.html,
    });
  } finally {
    try { await client.close(); } catch { /* connexion déjà fermée */ }
  }
}

async function getCaller(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const client = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { data } = await client.auth.getUser();
  return data?.user ?? null;
}

function isAdmin(user: { email?: string; app_metadata?: Record<string, unknown> } | null) {
  return !!user &&
    user.email?.trim().toLowerCase() === ADMIN_EMAIL &&
    user.app_metadata?.provider === "google";
}

function isEmail(v: unknown) {
  return typeof v === "string" && v.length <= 254 && /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(v.trim());
}

function clean(v: unknown, max: number) {
  return String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// Gabarit repris de l'ancien template EmailJS d'EconGlobe.
// Tout le texte est échappé avant insertion.
function toHtml(message: string, subject = "", fromName = "EconGlobe", replyTo = ADMIN_EMAIL) {
  const body = escapeHtml(message.trim()).replace(/\n/g, "<br>");
  return `<div style="font-family: Georgia, 'Times New Roman', serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #1a1a1a;">
<div style="background: #e3120b; padding: 20px 30px;"><span style="color: #ffffff; font-size: 22px; font-weight: bold; letter-spacing: 0.5px;"><span style="font-family: 'comic sans ms', sans-serif; font-size: 24pt;">E</span>con<span style="font-family: 'comic sans ms', sans-serif; font-size: 24pt;">G</span>lobe</span></div>
<div style="padding: 30px; border: 1px solid #eee; border-top: none;">
<h2 style="margin-top: 0; font-size: 18px; color: #1a1a1a;">${escapeHtml(subject)}</h2>
<p style="font-size: 15px; line-height: 1.6; color: #333;">${body}</p>
<hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
<p style="font-size: 13px; color: #888;">Envoy&eacute; par <strong>${escapeHtml(fromName)}</strong><br>Vous pouvez r&eacute;pondre directement &agrave; cet e-mail (reply-to : ${escapeHtml(replyTo)}).</p>
</div>
<div style="padding: 15px 30px; font-size: 12px; color: #aaa;">&copy; EconGlobe &mdash; Notification automatique</div>
</div>`;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
