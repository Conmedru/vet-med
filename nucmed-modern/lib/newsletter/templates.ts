import { SITE_URL } from "@/lib/config";
import type { NewsletterDigest } from './index';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { digestUtm, NOTIFICATION_UTM, withUtm, type Utm } from '@/lib/analytics/utm';

// Constants
const SITE_NAME = 'CON-VET.ru';

// CON-VET brand: the site's primary teal (hsl(192 82% 31%)) and ink; logo as PNG —
// WebP and SVG are not shown by Outlook and part of webmail clients
const BRAND = '#0E7490';
const INK = '#0B2A33';
const MUTED = '#5B6B70';
const BG = '#EEF5F7';
const FONT = "Helvetica, Arial, sans-serif";
const LOGO_URL = `${SITE_URL}/con-vet-logo.png`; // 740×117
const SUPPORT_EMAIL = 'content@icon-media.ru';
const PREFERENCES_URL = `${SITE_URL}/account?tab=digest`;

/** Text from the database goes into HTML: titles may contain <, > and & */
export function escapeHtml(value: string | null | undefined): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** «9–15 ноября 2026» or «26 октября – 1 ноября 2026» */
export function digestDateRange(start: Date, end: Date): string {
    const year = format(end, 'yyyy');
    return start.getMonth() === end.getMonth()
        ? `${format(start, 'd')}–${format(end, 'd MMMM', { locale: ru })} ${year}`
        : `${format(start, 'd MMMM', { locale: ru })} – ${format(end, 'd MMMM', { locale: ru })} ${year}`;
}

// User provided styles
const HEAD_STYLES = `
    html {
        -webkit-text-size-adjust: none;
        -ms-text-size-adjust: none;
    }
    .em-font-Inter-Regular {
        font-family: Inter,sans-serif!important;
        font-weight: 400!important;
    }
    @media only screen and (max-device-width:660px),only screen and (max-width:660px) {
        .em-narrow-table {
            width: 100%!important;
            max-width: 660px!important;
            min-width: 320px!important;
        }
        .em-mob-wrap.em-mob-wrap-cancel,.noresp-em-mob-wrap.em-mob-wrap-cancel {
            display: table-cell!important;
        }
        .em-mob-text-align-left {
            text-align: left!important;
        }
        .em-mob-padding_top-20 {
            padding-top: 20px!important;
        }
        .em-mob-padding_bottom-20 {
            padding-bottom: 20px!important;
        }
        .em-mob-padding_bottom-30 {
            padding-bottom: 30px!important;
        }
        .em-mob-width-100perc {
            width: 100%!important;
            max-width: 100%!important;
        }
        .em-mob-wrap {
            display: block!important;
        }
        .em-mob-padding_right-20 {
            padding-right: 20px!important;
        }
        .em-mob-padding_left-20 {
            padding-left: 20px!important;
        }
        .em-mob-padding_top-0 {
            padding-top: 0!important;
        }
        .em-mob-padding_right-0 {
            padding-right: 0!important;
        }
        .em-mob-padding_bottom-0 {
            padding-bottom: 0!important;
        }
        .em-mob-padding_left-0 {
            padding-left: 0!important;
        }
        .em-mob-padding_top-15 {
            padding-top: 15px!important;
        }
        .em-mob-width-48perc {
            width: 48%!important;
        }
        .em-mob-width-auto {
            width: auto!important;
            max-width: auto!important;
            min-width: none!important;
        }
    }
`;

const logo = (href: string, width: number) =>
    `<a href="${href}" target="_blank" style="text-decoration: none;"><img src="${LOGO_URL}" alt="CON-VET.ru" width="${width}" height="${Math.round((width * 117) / 740)}" style="display: block; width: ${width}px; height: auto; border: 0;"></a>`;

const button = (href: string, label: string) => `
    <table cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" valign="middle" bgcolor="${BRAND}" style="border-radius: 8px; background-color: ${BRAND};">
            <a href="${href}" target="_blank" style="display: inline-block; padding: 10px 22px; font-family: ${FONT}; font-size: 15px; line-height: 20px; font-weight: bold; color: #ffffff; text-decoration: none;">${label}</a>
        </td>
    </tr></table>`;

const BASE_TEMPLATE = (title: string, preheader: string, content: string, utm: Utm) => `
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html lang="ru"><head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style type="text/css">
		${HEAD_STYLES}
	</style>
    <!--[if gte mso 9]>
	<xml>
		<o:OfficeDocumentSettings>
		<o:AllowPNG></o:AllowPNG>
		<o:PixelsPerInch>96</o:PixelsPerInch>
		</o:OfficeDocumentSettings>
	</xml>
	<![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${BG};">
    <span class="preheader" style="display: none !important; visibility: hidden; opacity: 0; color: ${BG}; height: 0; width: 0; font-size: 1px; mso-hide: all;">${escapeHtml(preheader)}</span>
    <!--[if !mso]><!-->
    <div style="display: none; font-size: 0px; line-height: 0px; max-height: 0px; overflow: hidden; opacity: 0;">&#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847; &#8199;&#847;</div>
    <!--<![endif]-->
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size: 1px; line-height: normal;" bgcolor="${BG}">
        <tr>
            <td align="center" style="padding-top: 24px; padding-bottom: 24px;" class="em-mob-padding_top-0 em-mob-padding_right-0 em-mob-padding_bottom-0 em-mob-padding_left-0">
                <!--[if (gte mso 9)|(IE)]>
				<table cellpadding="0" cellspacing="0" border="0" width="660"><tr><td>
				<![endif]-->
                <table cellpadding="0" cellspacing="0" width="100%" border="0" style="max-width: 660px; min-width: 660px; width: 660px;" class="em-narrow-table">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 24px 20px 20px 20px; background-color: #ffffff; border-bottom: 3px solid ${BRAND};" bgcolor="#FFFFFF" class="em-mob-padding_left-20 em-mob-padding_right-20">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
                          <td valign="middle">${logo(withUtm(SITE_URL, utm), 190)}</td>
                          <td valign="middle" align="right">
                            <a href="${withUtm(`${SITE_URL}/news`, utm)}" target="_blank" style="font-family: ${FONT}; font-size: 14px; line-height: 20px; color: ${BRAND}; text-decoration: none; font-weight: bold; white-space: nowrap;">Все новости&nbsp;→</a>
                          </td>
                        </tr></table>
                      </td>
                    </tr>

                    ${content}

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 28px 20px 32px 20px; background-color: #ffffff; border-top: 1px solid #DCE7EA;" bgcolor="#FFFFFF" class="em-mob-padding_left-20 em-mob-padding_right-20">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr><td style="padding-bottom: 14px;">${logo(withUtm(SITE_URL, utm), 130)}</td></tr>
                          <tr><td style="padding-bottom: 14px; font-family: ${FONT}; font-size: 13px; line-height: 20px; color: ${MUTED};">
                            Профессиональный портал для ветеринарных врачей.<br>Вы получили это письмо, потому что подписались на дайджест на&nbsp;сайте ${SITE_NAME}.
                          </td></tr>
                          <tr><td style="font-family: ${FONT}; font-size: 13px; line-height: 20px; color: ${MUTED};">
                            <a href="mailto:${SUPPORT_EMAIL}" target="_blank" style="color: ${MUTED}; text-decoration: underline;">Написать редакции</a>&nbsp;&nbsp;·&nbsp;
                            <a href="${PREFERENCES_URL}" target="_blank" style="color: ${MUTED}; text-decoration: underline;">Настроить подписку</a>&nbsp;&nbsp;·&nbsp;
                            <a href="{{UnsubscribeUrl}}" target="_blank" style="color: ${MUTED}; text-decoration: underline;">Отписаться</a>
                          </td></tr>
                          <tr><td style="padding-top: 14px; font-family: ${FONT}; font-size: 12px; line-height: 18px; color: #8A979B;">© ${new Date().getFullYear()} ${SITE_NAME}</td></tr>
                        </table>
                      </td>
                    </tr>
                </table>
                <!--[if (gte mso 9)|(IE)]>
				</td></tr></table>
				<![endif]-->
            </td>
        </tr></table>
</body></html>
`;

export function generateDigestHtml(digest: NewsletterDigest): string {
    const { articles, dateRange } = digest;
    const utm = digestUtm(digest.id);

    let content = `
    <!-- Intro -->
    <tr>
      <td style="padding: 28px 20px 8px 20px; background-color: #ffffff;" bgcolor="#FFFFFF" class="em-mob-padding_left-20 em-mob-padding_right-20">
        <div style="font-family: ${FONT}; font-size: 12px; line-height: 16px; letter-spacing: 1px; text-transform: uppercase; font-weight: bold; color: ${BRAND};">Еженедельный дайджест</div>
        <div style="padding-top: 6px; font-family: ${FONT}; font-size: 26px; line-height: 32px; font-weight: bold; color: ${INK};">${digestDateRange(dateRange.start, dateRange.end)}</div>
        <div style="padding-top: 10px; font-family: ${FONT}; font-size: 15px; line-height: 22px; color: ${MUTED};">Главные материалы недели для ветеринарных врачей: исследования, клинические случаи и новости отрасли.</div>
      </td>
    </tr>
    `;

    for (const article of articles) {
        const imageUrl = article.imageUrl || '';
        const title = escapeHtml(article.title);
        content += `
            <tr>
              <td style="padding: 20px; background-color: #ffffff;" bgcolor="#FFFFFF" class="em-mob-padding_left-20 em-mob-padding_right-20">
                <table border="0" cellspacing="0" cellpadding="0" width="100%" class="em-mob-width-100perc" style="border-top: 1px solid #E3ECEE;">
                  <tr>
                    ${imageUrl ? `
                    <td width="240" valign="top" style="padding-top: 20px;" class="em-mob-wrap em-mob-width-100perc">
                      <a href="${article.url}" target="_blank" style="text-decoration: none;"><img src="${imageUrl}" width="240" border="0" alt="${title}" style="display: block; width: 100%; max-width: 240px; height: auto; border-radius: 8px;" class="em-mob-width-100perc"></a>
                    </td>
                    <td width="20" class="em-mob-wrap">&nbsp;</td>
                    ` : ''}
                    <td valign="top" style="padding-top: 20px;" class="em-mob-wrap em-mob-width-100perc">
                      ${article.category ? `<div style="font-family: ${FONT}; font-size: 12px; line-height: 16px; letter-spacing: 0.5px; text-transform: uppercase; font-weight: bold; color: ${BRAND}; padding-bottom: 6px;">${escapeHtml(article.category)}</div>` : ''}
                      <a href="${article.url}" target="_blank" style="font-family: ${FONT}; font-size: 18px; line-height: 24px; font-weight: bold; color: ${INK}; text-decoration: none;">${title}</a>
                      ${article.excerpt ? `<div style="padding-top: 8px; font-family: ${FONT}; font-size: 14px; line-height: 21px; color: ${MUTED};">${escapeHtml(article.excerpt)}</div>` : ''}
                      <div style="padding-top: 12px;"><a href="${article.url}" target="_blank" style="font-family: ${FONT}; font-size: 14px; line-height: 20px; font-weight: bold; color: ${BRAND}; text-decoration: none;">Читать&nbsp;→</a></div>
                    </td>
                  </tr></table>
              </td>
            </tr>
            `;
    }

    content += `
    <tr>
      <td align="center" style="padding: 12px 20px 32px 20px; background-color: #ffffff;" bgcolor="#FFFFFF">
        ${button(withUtm(`${SITE_URL}/news`, utm), 'Все новости на сайте')}
      </td>
    </tr>`;

    return BASE_TEMPLATE(digest.subject, digest.preheader, content, utm);
}

export function generateNotificationHtml(article: {
    title: string;
    excerpt?: string | null;
    imageUrl?: string | null;
    url: string;
    category?: string | null;
}): string {
    const subject = `Новая статья: ${article.title}`;
    const preheader = article.excerpt ? article.excerpt.substring(0, 100) : 'Читайте новую статью на CON-VET.ru';
    const title = escapeHtml(article.title);

    const content = `
    <tr>
      <td style="padding: 28px 20px; background-color: #ffffff;" bgcolor="#FFFFFF" class="em-mob-padding_left-20 em-mob-padding_right-20">
        <div style="font-family: ${FONT}; font-size: 12px; line-height: 16px; letter-spacing: 1px; text-transform: uppercase; font-weight: bold; color: ${BRAND};">${escapeHtml(article.category || 'Новость')}</div>
        <div style="padding-top: 8px; padding-bottom: 20px; font-family: ${FONT}; font-size: 24px; line-height: 30px; font-weight: bold; color: ${INK};">${title}</div>
        ${article.imageUrl ? `<a href="${article.url}" target="_blank"><img src="${article.imageUrl}" width="620" border="0" alt="${title}" style="display: block; width: 100%; max-width: 620px; height: auto; border-radius: 8px;"></a>` : ''}
        ${article.excerpt ? `<div style="padding-top: 20px; font-family: ${FONT}; font-size: 16px; line-height: 24px; color: ${INK};">${escapeHtml(article.excerpt)}</div>` : ''}
        <div style="padding-top: 24px;">${button(article.url, 'Читать полностью')}</div>
      </td>
    </tr>
    `;

    return BASE_TEMPLATE(subject, preheader, content, NOTIFICATION_UTM);
}
