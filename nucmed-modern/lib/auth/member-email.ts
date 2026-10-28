import { unisender } from "@/lib/unisender";

const SITE_NAME = "CON-VET.RU";
const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://con-vet.ru";

/** Names come from the public registration form: escape before putting them into HTML */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrapEmail(title: string, bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #15120D;">
      <div style="font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #7E7669; margin-bottom: 18px;">${SITE_NAME}</div>
      <h1 style="font-size: 22px; margin: 0 0 16px;">${title}</h1>
      ${bodyHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #7E7669;">
        Если вы не запрашивали это письмо, просто игнорируйте его.
      </p>
    </div>
  `;
}

/**
 * Мягкая верификация email: письмо отправляется после регистрации, но
 * доступ к порталу (включая закрытые материалы) уже открыт — ссылка из
 * письма только подтверждает адрес для рассылок и восстановления пароля.
 */
export async function sendMemberVerificationEmail(email: string, name: string, token: string) {
  const url = `${SITE_URL}/verify-email?token=${token}`;
  const html = wrapEmail(
    "Подтвердите ваш email",
    `
      <p>Здравствуйте, ${escapeHtml(name)}!</p>
      <p>Спасибо за регистрацию на портале ${SITE_NAME}. Чтобы мы могли присылать вам подборки материалов и уведомления, подтвердите email:</p>
      <p style="margin: 24px 0;">
        <a href="${url}" style="display: inline-block; background: #15120D; color: #FBF8F1; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Подтвердить email</a>
      </p>
      <p style="font-size: 13px; color: #7E7669;">Ссылка действует 48 часов.</p>
    `
  );
  return unisender.sendEmail(email, `Подтвердите email на ${SITE_NAME}`, html);
}

export async function sendMemberPasswordResetEmail(email: string, name: string, token: string) {
  const url = `${SITE_URL}/reset-password?token=${token}`;
  const html = wrapEmail(
    "Восстановление пароля",
    `
      <p>Здравствуйте, ${escapeHtml(name)}!</p>
      <p>Мы получили запрос на восстановление пароля от вашего аккаунта на ${SITE_NAME}.</p>
      <p style="margin: 24px 0;">
        <a href="${url}" style="display: inline-block; background: #15120D; color: #FBF8F1; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Задать новый пароль</a>
      </p>
      <p style="font-size: 13px; color: #7E7669;">Ссылка действует 1 час.</p>
    `
  );
  return unisender.sendEmail(email, `Восстановление пароля — ${SITE_NAME}`, html);
}
