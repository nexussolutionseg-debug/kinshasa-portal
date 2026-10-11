// The welcome email sent to every new newsletter subscriber (2026-10-11).
// Brand identity: flag strip, Kinshasa Label lockup, Outfit-like bold
// headings (falls back to Arial: email apps don't load web fonts reliably),
// brand blue / red / yellow, "tu". Table layout + inline styles so it looks
// right in Gmail, Outlook and phone mail apps. Edit the text here.

const SITE = 'https://www.kinshasalabel.com';
const UTM = 'utm_source=newsletter&utm_medium=email&utm_campaign=bienvenue';
const link = (path: string, content: string) => `${SITE}${path}${path.includes('?') ? '&' : '?'}${UTM}&utm_content=${content}`;

export const WELCOME_SUBJECT = 'Mbote ! Bienvenue chez Kinshasa Label 👋';

export function welcomeEmailText(): string {
  return [
    'Mbote et bienvenue !',
    '',
    "Merci de rejoindre Kinshasa Label, le guide joyeux de Kinshasa : bonnes adresses, sorties, culture et actualité de la ville, commune par commune.",
    '',
    'Chaque semaine, tu recevras :',
    '- les nouvelles adresses à tester (restos, terrasses, lieux à voir)',
    '- les sorties du week-end',
    "- l'essentiel de l'actu de Kin, sans politique",
    '',
    `Explore Kin sur la carte : ${link('/', 'carte')}#explorer`,
    `Kin Actualité : ${link('/actualite', 'actu')}`,
    `Les 24 communes : ${link('/communes', 'communes')}`,
    '',
    'Suis-nous sur Instagram : https://www.instagram.com/kinshasalabel',
    '',
    'Vis Kin autrement,',
    "L'équipe Kinshasa Label",
    '',
    "Tu reçois cet e-mail parce que tu t'es inscrit(e) sur kinshasalabel.com. Pour te désinscrire, réponds simplement « STOP » à cet e-mail.",
  ].join('\n');
}

export function welcomeEmailHtml(): string {
  const font = "'Outfit','Segoe UI',Arial,Helvetica,sans-serif";
  const body = "'Segoe UI',Arial,Helvetica,sans-serif";
  const pill = (href: string, label: string, bg: string, color: string) =>
    `<a href="${href}" style="display:inline-block;background:${bg};color:${color};font-family:${font};font-weight:700;font-size:15px;line-height:20px;text-decoration:none;padding:12px 20px;border-radius:999px;margin:4px 6px 4px 0">${label}</a>`;
  const item = (emoji: string, title: string, text: string) => `
      <tr><td style="padding:0 0 14px 0">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="top" style="width:44px;font-size:24px;line-height:30px">${emoji}</td>
          <td valign="top" style="font-family:${body};font-size:16px;line-height:24px;color:#0B2545"><b>${title}</b><br><span style="color:#5E6E86">${text}</span></td>
        </tr></table>
      </td></tr>`;

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>${WELCOME_SUBJECT}</title></head>
<body style="margin:0;padding:0;background:#F5F8FE">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Les meilleures adresses, sorties et infos de Kin, chaque semaine dans ta boîte.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F8FE"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #DCE5F3">
    <tr><td style="font-size:0;line-height:0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td height="6" style="background:#1A82F5;width:33%"></td><td height="6" style="background:#FCD933;width:34%"></td><td height="6" style="background:#D21C2E;width:33%"></td>
    </tr></table></td></tr>
    <tr><td align="left" style="padding:28px 32px 8px 32px">
      <a href="${link('/', 'logo')}"><img src="${SITE}/email/kinshasa-label-lockup.png" width="260" alt="Kinshasa Label · Vis Kin autrement" style="display:block;width:260px;max-width:70%;height:auto;border:0"></a>
    </td></tr>
    <tr><td style="padding:16px 32px 0 32px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0A2A66;background-image:linear-gradient(135deg,#0A2A66,#1A82F5);border-radius:18px"><tr><td style="padding:28px 28px 26px 28px">
        <p style="margin:0 0 10px 0;font-family:${font};font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#FCD933">Bienvenue dans la famille</p>
        <h1 style="margin:0;font-family:${font};font-size:30px;line-height:36px;font-weight:800;color:#FFFFFF">Mbote ! Le meilleur de Kinshasa, <span style="color:#FCD933">commune par commune.</span></h1>
        <p style="margin:14px 0 0 0;font-family:${body};font-size:16px;line-height:24px;color:#DCE8FB">Merci de nous rejoindre. Kinshasa Label, c'est le guide joyeux de Kin : bonnes adresses, sorties, culture et actualité de la ville, notées par les Kinois.</p>
      </td></tr></table>
    </td></tr>
    <tr><td style="padding:26px 32px 6px 32px">
      <p style="margin:0 0 16px 0;font-family:${font};font-size:19px;font-weight:800;color:#0B2545">Chaque semaine, dans ta boîte :</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${item('🍽️', 'Les nouvelles adresses', 'Restos, maquis, terrasses et lieux à voir, partout à Kin.')}
        ${item('🎶', 'Les sorties du week-end', 'Concerts, expos, soirées : quoi faire et où aller.')}
        ${item('📰', "L'essentiel de l'actu de Kin", 'La vie de la ville, sans politique.')}
      </table>
    </td></tr>
    <tr><td style="padding:6px 32px 8px 32px">
      ${pill(`${link('/', 'carte')}#explorer`, '🗺️ Explore Kin sur la carte', '#D21C2E', '#FFFFFF')}
      ${pill(link('/actualite', 'actu'), 'Kin Actualité', '#E6F1FF', '#0E5FC9')}
      ${pill(link('/communes', 'communes'), 'Les 24 communes', '#FFF7D1', '#7A5B00')}
    </td></tr>
    <tr><td style="padding:22px 32px 28px 32px">
      <p style="margin:0;font-family:${body};font-size:16px;line-height:24px;color:#0B2545">Une adresse à nous recommander ? Réponds simplement à cet e-mail, on lit tout.</p>
      <p style="margin:14px 0 0 0;font-family:${font};font-size:16px;font-weight:700;color:#0B2545">Vis Kin autrement,<br><span style="color:#D21C2E">L'équipe Kinshasa Label</span></p>
    </td></tr>
    <tr><td style="padding:18px 32px 24px 32px;background:#F5F8FE;border-top:1px solid #DCE5F3">
      <p style="margin:0 0 8px 0;font-family:${body};font-size:14px;line-height:20px;color:#0B2545"><a href="https://www.instagram.com/kinshasalabel" style="color:#0E5FC9;font-weight:700;text-decoration:none">Instagram @kinshasalabel</a> · <a href="${link('/', 'footer')}" style="color:#0E5FC9;font-weight:700;text-decoration:none">kinshasalabel.com</a></p>
      <p style="margin:0;font-family:${body};font-size:12px;line-height:18px;color:#5E6E86">Tu reçois cet e-mail parce que tu t'es inscrit(e) sur kinshasalabel.com. Pour te désinscrire, réponds « STOP » à cet e-mail. <a href="${SITE}/politique-de-confidentialite" style="color:#5E6E86">Confidentialité</a></p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}
