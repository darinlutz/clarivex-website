// The look of the emails the site sends to its users (the email address
// confirmation and the password reset): the Clarivex logo, a white card with
// the message and a powder-blue button, and a footer, in the site's colors.
//
// Built for email apps rather than browsers: tables for layout, every style
// inline, no web fonts or SVG (Gmail and Outlook drop them), the logo as a PNG
// at an absolute URL with alt text and a fixed size so a message with images
// blocked still reads well, and the link written out under the button for
// email apps that strip buttons.

const COLORS = {
  page: '#f1f5f9',
  card: '#ffffff',
  border: '#e2e8f0',
  heading: '#1e3a8a',
  text: '#334155',
  muted: '#64748b',
  primary: '#0284c7',
  primaryLight: '#0ea5e9',
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// Email apps can't load images from a developer's machine, so emails sent
// while running locally take the logo from the live site.
const LIVE_SITE = 'https://clarivex.app';

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export type EmailContent = {
  siteUrl: string;
  subject: string;
  heading: string;
  // Paragraphs before the button
  intro: string[];
  button: { label: string; url: string };
  // Under the button: how long the link lasts
  note?: string;
  // Small print at the bottom of the card, e.g. what to do when it wasn't you
  footnote: string;
};

export function renderEmail(email: EmailContent): { html: string; text: string } {
  const site = email.siteUrl.replace(/\/+$/, '');
  const host = site.replace(/^https?:\/\//, '');
  const assets = /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|$)/.test(site) ? LIVE_SITE : site;
  const url = escapeHtml(email.button.url);
  const paragraph = (text: string) =>
    `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:26px;color:${COLORS.text};">${escapeHtml(text)}</p>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(email.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(email.intro[0] ?? '')}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.page};">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
        <tr>
          <td style="background-color:${COLORS.card};border:1px solid ${COLORS.border};border-radius:16px;overflow:hidden;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="${COLORS.primary}" style="height:6px;background-color:${COLORS.primary};background-image:linear-gradient(90deg,${COLORS.primaryLight},${COLORS.primary},${COLORS.heading});font-size:0;line-height:0;">&nbsp;</td>
              </tr>
              <tr>
                <td align="center" style="padding:28px 40px 20px;border-bottom:1px solid ${COLORS.border};">
                  <a href="${escapeHtml(site)}" style="text-decoration:none;">
                    <img src="${escapeHtml(assets)}/assets/png/clarivex_logo_white.png" width="240" height="72" alt="Clarivex"
                      style="display:block;border:0;outline:none;width:240px;height:72px;color:${COLORS.heading};font-family:${FONT};font-size:28px;font-weight:bold;">
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:36px 40px 8px;">
                  <h1 style="margin:0 0 20px;font-family:${FONT};font-size:24px;line-height:32px;font-weight:700;color:${COLORS.heading};">${escapeHtml(email.heading)}</h1>
                  ${email.intro.map(paragraph).join('\n                  ')}
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:12px 40px 28px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" bgcolor="${COLORS.primary}" style="border-radius:10px;background-color:${COLORS.primary};background-image:linear-gradient(90deg,${COLORS.primaryLight},${COLORS.primary});">
                        <a href="${url}" target="_blank"
                          style="display:inline-block;padding:14px 36px;font-family:${FONT};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(email.button.label)}</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 40px 32px;">
                  ${email.note ? `<p style="margin:0 0 16px;font-family:${FONT};font-size:14px;line-height:22px;color:${COLORS.muted};text-align:center;">${escapeHtml(email.note)}</p>` : ''}
                  <p style="margin:0 0 6px;font-family:${FONT};font-size:13px;line-height:20px;color:${COLORS.muted};">If the button doesn&#39;t work, copy this link into your browser:</p>
                  <p style="margin:0;font-family:${FONT};font-size:13px;line-height:20px;word-break:break-all;"><a href="${url}" style="color:${COLORS.primary};text-decoration:underline;">${url}</a></p>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 40px 24px;background-color:#f8fafc;border-top:1px solid ${COLORS.border};">
                  <p style="margin:0;font-family:${FONT};font-size:13px;line-height:20px;color:${COLORS.muted};">${escapeHtml(email.footnote)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:24px 16px 0;">
            <p style="margin:0 0 4px;font-family:${FONT};font-size:12px;line-height:18px;letter-spacing:2px;color:${COLORS.muted};">CLARITY IN COMPLEXITY</p>
            <p style="margin:0;font-family:${FONT};font-size:12px;line-height:18px;color:${COLORS.muted};">
              Clarivex LLC &middot; <a href="${escapeHtml(site)}" style="color:${COLORS.muted};text-decoration:underline;">${escapeHtml(host)}</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = [
    email.heading,
    '',
    ...email.intro.flatMap((p) => [p, '']),
    `${email.button.label}: ${email.button.url}`,
    '',
    ...(email.note ? [email.note, ''] : []),
    email.footnote,
    '',
    `-- \nClarivex LLC · ${host}`,
  ].join('\n');

  return { html, text };
}

// Sends one of the site's emails through Resend. False when it couldn't be
// sent; the reason goes to the server log.
export async function sendEmail(to: string, email: EmailContent): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error(`Resend API key not configured. "${email.subject}" email not sent.`);
    return false;
  }
  const { html, text } = renderEmail(email);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendApiKey}` },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to,
        subject: email.subject,
        text,
        html,
      }),
    });
    if (!response.ok) {
      console.error(`Resend API error ("${email.subject}"):`, await response.json().catch(() => ({})));
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Email error ("${email.subject}"):`, error);
    return false;
  }
}
