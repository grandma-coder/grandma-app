/**
 * Builds the Supabase Auth email templates in supabase/templates/ from one layout, in the app's
 * look (cream paper, ink outline, hand-lettered heading, yellow pill button, a site sticker).
 *
 *   node scripts/email-templates/build.mjs
 *
 * Paste each generated file into Supabase → Authentication → Emails → Templates (subject from
 * supabase/templates/subjects.txt). Auth templates switch language on the account's
 * `user_metadata.locale` (lib/emailLocale.ts keeps it in step with the app): pt-BR, es, else English.
 * Security notices don't get user metadata, so they carry all three languages.
 * Images are served by the site from site/public/email/.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../supabase/templates')
const IMG = 'https://www.thegrandma.app/email'
const SUPPORT = 'grandma@sauceroom.co'

const INK = '#161513', INK2 = '#4F4B43', INK3 = '#8C877C', BG = '#F3F0E8', PAPER = '#FBF6EA', YELLOW = '#F9C846'
const HAND = "'Architects Daughter', 'Comic Sans MS', 'Chalkboard SE', cursive"
const BODY = "'Hanken Grotesk', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"

// Go template: the account language, '<no value>' when it was never saved.
const LANG = '{{ $l := "" }}{{ with .Data }}{{ $l = printf "%v" .locale }}{{ end }}'
const byLang = (en, pt, es) =>
  `{{ if or (eq $l "pt-BR") (eq $l "pt") }}${pt}{{ else if eq $l "es" }}${es}{{ else }}${en}{{ end }}`

const esc = (s) => s // copy below is trusted, written here

function button(url, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px">
  <tr><td style="border-radius:999px;background:${YELLOW};border:2px solid ${INK};box-shadow:0 3px 0 ${INK}">
    <a href="${url}" style="display:inline-block;padding:14px 28px;font-family:${BODY};font-size:16px;font-weight:700;color:${INK};text-decoration:none;border-radius:999px">${label}</a>
  </td></tr></table>`
}

function layout({ preheader, sticker, heading, body, cta, after, footer }) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<link href="https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Hanken+Grotesk:wght@400;700&display=swap" rel="stylesheet">
<title>Grandma</title>
</head>
<body style="margin:0;padding:0;background:${BG};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG}">
<tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">
    <tr><td style="padding:0 4px 18px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="vertical-align:middle"><img src="${IMG}/eye.png" width="40" height="40" alt="" style="display:block;border:0"></td>
        <td style="vertical-align:middle;padding-left:8px;font-family:${HAND};font-size:24px;color:${INK}">grandma</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:${PAPER};border:2px solid ${INK};border-radius:28px;box-shadow:0 4px 0 ${INK};padding:32px 28px 28px">
      <img src="${IMG}/${sticker}.png" width="72" height="72" alt="" style="display:block;border:0;margin:0 0 16px">
      <h1 style="margin:0 0 12px;font-family:${HAND};font-weight:400;font-size:28px;line-height:1.2;letter-spacing:.5px;text-transform:uppercase;color:${INK}">${heading}</h1>
      <div style="font-family:${BODY};font-size:16px;line-height:1.55;color:${INK2}">${body}</div>
      ${cta ?? ''}
      ${after ? `<div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(26,25,22,.12);font-family:${BODY};font-size:13px;line-height:1.5;color:${INK3}">${after}</div>` : ''}
    </td></tr>
    <tr><td style="padding:20px 8px 0;font-family:${BODY};font-size:12px;line-height:1.5;color:${INK3};text-align:center">
      ${footer}<br><a href="https://www.thegrandma.app" style="color:${INK3}">thegrandma.app</a> · <a href="mailto:${SUPPORT}" style="color:${INK3}">${SUPPORT}</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>
`
}

const FOOT = byLang(
  'You’re getting this because of your Grandma account.',
  'Você recebeu este email por causa da sua conta no Grandma.',
  'Recibes este email por tu cuenta de Grandma.',
)
const FALLBACK = (url) => byLang(
  `Button not working? Paste this link into your browser:<br><a href="${url}" style="color:${INK3};word-break:break-all">${url}</a>`,
  `O botão não funciona? Cole este link no navegador:<br><a href="${url}" style="color:${INK3};word-break:break-all">${url}</a>`,
  `¿El botón no funciona? Pega este enlace en tu navegador:<br><a href="${url}" style="color:${INK3};word-break:break-all">${url}</a>`,
)
const URL = '{{ .ConfirmationURL }}'

/** Auth templates: one language per account. */
const AUTH = {
  confirmation: {
    subject: ['Confirm your email for Grandma', 'Confirme seu email no Grandma', 'Confirma tu email en Grandma'],
    sticker: 'love',
    heading: ['One tap and you’re in', 'Falta só um toque', 'Solo falta un toque'],
    body: [
      'Confirm this email so we can keep your account safe and send you a new-password link if you ever need one.',
      'Confirme este email para mantermos sua conta segura e podermos te mandar um link de nova senha se você precisar.',
      'Confirma este email para mantener tu cuenta segura y poder enviarte un enlace de nueva contraseña si lo necesitas.',
    ],
    button: ['Confirm my email', 'Confirmar meu email', 'Confirmar mi email'],
    after: [
      'Didn’t sign up for Grandma? You can ignore this email.',
      'Não criou uma conta no Grandma? Pode ignorar este email.',
      '¿No creaste una cuenta en Grandma? Puedes ignorar este email.',
    ],
  },
  recovery: {
    subject: ['Reset your Grandma password', 'Redefina sua senha do Grandma', 'Restablece tu contraseña de Grandma'],
    sticker: 'lock',
    heading: ['Let’s get you back in', 'Vamos te colocar de volta', 'Volvamos a entrar'],
    body: [
      'Tap the button on your phone to choose a new password. The link works once and expires in 1 hour.',
      'Toque no botão pelo celular para escolher uma nova senha. O link funciona uma vez e expira em 1 hora.',
      'Toca el botón desde tu teléfono para elegir una nueva contraseña. El enlace funciona una vez y caduca en 1 hora.',
    ],
    button: ['Choose a new password', 'Escolher nova senha', 'Elegir nueva contraseña'],
    after: [
      'Didn’t ask for this? Ignore this email — your password stays the same.',
      'Não foi você que pediu? Ignore este email — sua senha continua a mesma.',
      '¿No lo pediste? Ignora este email: tu contraseña sigue igual.',
    ],
  },
  magic_link: {
    subject: ['Your Grandma sign-in link', 'Seu link para entrar no Grandma', 'Tu enlace para entrar en Grandma'],
    sticker: 'me',
    heading: ['Sign in to Grandma', 'Entrar no Grandma', 'Entrar en Grandma'],
    body: [
      'Tap the button on your phone to sign in. The link works once and expires in 1 hour.',
      'Toque no botão pelo celular para entrar. O link funciona uma vez e expira em 1 hora.',
      'Toca el botón desde tu teléfono para entrar. El enlace funciona una vez y caduca en 1 hora.',
    ],
    button: ['Sign in', 'Entrar', 'Entrar'],
    after: [
      'Didn’t ask for this? You can ignore this email.',
      'Não foi você que pediu? Pode ignorar este email.',
      '¿No lo pediste? Puedes ignorar este email.',
    ],
  },
  email_change: {
    subject: ['Confirm your new email for Grandma', 'Confirme seu novo email no Grandma', 'Confirma tu nuevo email en Grandma'],
    sticker: 'pencil',
    heading: ['Confirm your new email', 'Confirme o novo email', 'Confirma el nuevo email'],
    body: [
      'Tap below to use <strong style="color:#161513">{{ .NewEmail }}</strong> for your Grandma account.',
      'Toque abaixo para usar <strong style="color:#161513">{{ .NewEmail }}</strong> na sua conta do Grandma.',
      'Toca abajo para usar <strong style="color:#161513">{{ .NewEmail }}</strong> en tu cuenta de Grandma.',
    ],
    button: ['Confirm new email', 'Confirmar novo email', 'Confirmar nuevo email'],
    after: [
      'Didn’t ask for this change? Ignore this email and your email stays the same.',
      'Não pediu essa troca? Ignore este email e seu email continua o mesmo.',
      '¿No pediste este cambio? Ignora este email y tu email sigue igual.',
    ],
  },
  invite: {
    subject: ['You’re invited to Grandma', 'Você foi convidada para o Grandma', 'Te invitaron a Grandma'],
    sticker: 'house',
    heading: ['Someone saved you a seat', 'Guardaram um lugar para você', 'Te guardaron un lugar'],
    body: [
      'You’ve been invited to join Grandma. Tap below to accept and set up your account.',
      'Você foi convidada para o Grandma. Toque abaixo para aceitar e criar sua conta.',
      'Te invitaron a unirte a Grandma. Toca abajo para aceptar y crear tu cuenta.',
    ],
    button: ['Accept invite', 'Aceitar convite', 'Aceptar invitación'],
    after: [
      'Not expecting this? You can ignore this email.',
      'Não esperava por isso? Pode ignorar este email.',
      '¿No lo esperabas? Puedes ignorar este email.',
    ],
  },
  reauthentication: {
    subject: ['Your Grandma code', 'Seu código do Grandma', 'Tu código de Grandma'],
    sticker: 'shield',
    heading: ['Here’s your code', 'Seu código', 'Tu código'],
    body: [
      'Enter this code in the app to confirm it’s you:',
      'Digite este código no app para confirmar que é você:',
      'Escribe este código en la app para confirmar que eres tú:',
    ],
    code: true,
    after: [
      'It expires soon. Didn’t ask for it? Ignore this email.',
      'Ele expira logo. Não foi você? Ignore este email.',
      'Caduca pronto. ¿No lo pediste? Ignora este email.',
    ],
  },
}

/** Security notices: no user metadata here, so all three languages, English first. */
const NOTICE = {
  password_changed_notification: {
    subject: 'Your Grandma password was changed',
    sticker: 'lock',
    heading: 'Password changed',
    lines: [
      ['The password for <strong style="color:#161513">{{ .Email }}</strong> was just changed. If this was you, you’re all set.',
        'If it wasn’t you, open Grandma → Forgot password to reset it now, and write to us.'],
      ['A senha de <strong style="color:#161513">{{ .Email }}</strong> acabou de ser trocada. Se foi você, está tudo certo.',
        'Se não foi você, abra o Grandma → Esqueci a senha para redefinir agora e escreva para a gente.'],
      ['La contraseña de <strong style="color:#161513">{{ .Email }}</strong> se acaba de cambiar. Si fuiste tú, todo listo.',
        'Si no fuiste tú, abre Grandma → Olvidé mi contraseña para restablecerla ahora y escríbenos.'],
    ],
  },
  email_changed_notification: {
    subject: 'Your Grandma email was changed',
    sticker: 'pencil',
    heading: 'Email changed',
    lines: [
      ['The email address on your Grandma account was just changed. If this was you, there’s nothing to do.',
        'If it wasn’t you, write to us right away.'],
      ['O email da sua conta no Grandma acabou de ser trocado. Se foi você, não precisa fazer nada.',
        'Se não foi você, escreva para a gente agora.'],
      ['El email de tu cuenta de Grandma se acaba de cambiar. Si fuiste tú, no tienes que hacer nada.',
        'Si no fuiste tú, escríbenos ahora.'],
    ],
  },
  identity_linked_notification: {
    subject: 'A new sign-in method was added to Grandma',
    sticker: 'shield',
    heading: 'New way to sign in',
    lines: [
      ['A new way to sign in (like Apple or Google) was just linked to your Grandma account. If this was you, you’re all set.',
        'If it wasn’t you, write to us right away.'],
      ['Uma nova forma de entrar (como Apple ou Google) foi ligada à sua conta no Grandma. Se foi você, está tudo certo.',
        'Se não foi você, escreva para a gente agora.'],
      ['Se vinculó una nueva forma de entrar (como Apple o Google) a tu cuenta de Grandma. Si fuiste tú, todo listo.',
        'Si no fuiste tú, escríbenos ahora.'],
    ],
  },
}

mkdirSync(OUT, { recursive: true })
const subjects = []

for (const [name, t] of Object.entries(AUTH)) {
  const pick = (arr) => byLang(...arr)
  const codeBox = `<div style="margin:20px 0 4px;padding:16px;border:2px dashed ${INK};border-radius:16px;text-align:center;font-family:${BODY};font-size:32px;font-weight:700;letter-spacing:8px;color:${INK}">{{ .Token }}</div>`
  const html = LANG + layout({
    preheader: pick(t.heading),
    sticker: t.sticker,
    heading: pick(t.heading),
    body: pick(t.body) + (t.code ? codeBox : ''),
    cta: t.code ? '' : button(URL, pick(t.button)),
    after: pick(t.after) + (t.code ? '' : `<br><br>${FALLBACK(URL)}`),
    footer: FOOT,
  })
  writeFileSync(join(OUT, `${name}.html`), html)
  subjects.push(`${name}: ${LANG}${pick(t.subject)}`)
}

for (const [name, t] of Object.entries(NOTICE)) {
  const [en, pt, es] = t.lines
  const block = (pair, first) =>
    `<p style="margin:${first ? '0' : '18px'} 0 0">${pair[0]}</p><p style="margin:8px 0 0">${pair[1]}</p>`
  const html = layout({
    preheader: t.subject,
    sticker: t.sticker,
    heading: t.heading,
    body: block(en, true) + `<div style="margin-top:18px;padding-top:14px;border-top:1px solid rgba(26,25,22,.12)">` + block(pt, true) + block(es, false) + '</div>',
    after: '',
    footer: 'Grandma',
  })
  writeFileSync(join(OUT, `${name}.html`), html)
  subjects.push(`${name}: ${t.subject}`)
}

writeFileSync(join(OUT, 'subjects.txt'), subjects.join('\n') + '\n')
console.log('wrote', subjects.length, 'templates to', OUT)
