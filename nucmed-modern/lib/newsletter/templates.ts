import { NewsletterArticle, NewsletterDigest } from './index';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Constants
const SITE_NAME = 'VetMed';
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://vetmed.ru';

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

const BASE_TEMPLATE = (title: string, preheader: string, content: string) => `
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html><head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400&display=swap" em-class="em-font-Inter-Regular">
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
<body style="margin: 0; padding: 0; background-color: #F8F8F8;">
    <span class="preheader" style="display: none !important; visibility: hidden; opacity: 0; color: #F8F8F8; height: 0; width: 0; font-size: 1px;">${preheader}</span>
    <!--[if !mso]><!-->
    <div style="font-size:0px;color:transparent;opacity:0;">
        ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    </div>
    <!--<![endif]-->
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size: 1px; line-height: normal;" bgcolor="#F8F8F8">
        <tr em="group">
            <td align="center" style="padding-top: 20px; padding-bottom: 20px;" class="em-mob-padding_top-0 em-mob-padding_right-0 em-mob-padding_bottom-0 em-mob-padding_left-0">
                <!--[if (gte mso 9)|(IE)]>
				<table cellpadding="0" cellspacing="0" border="0" width="660"><tr><td>
				<![endif]-->
                <table cellpadding="0" cellspacing="0" width="100%" border="0" style="max-width: 660px; min-width: 660px; width: 660px;" class="em-narrow-table">
                    ${content}
                    
                    <!-- Footer -->
                    <tr em="block" class="em-structure">
                      <td align="center" style="padding: 40px; background-color: #ffffff;" class="em-mob-padding_top-20 em-mob-padding_right-20 em-mob-padding_bottom-20 em-mob-padding_left-20" bgcolor="#FFFFFF">
                        <table border="0" cellspacing="0" cellpadding="0" class="em-mob-width-100perc">
                          <tr>
                            <td width="280" valign="top" class="em-mob-wrap em-mob-wrap-cancel em-mob-width-48perc">
                                <table cellpadding="0" cellspacing="0" border="0" width="100%" em="atom"><tr><td style="padding-bottom: 20px;" class="em-mob-padding_bottom-30">
                                    <a href="${SITE_URL}" style="text-decoration: none; font-size: 24px; font-weight: bold; font-family: Inter, sans-serif; color: #121212;">
                                        Vet<span style="color: #0891B2;">Med</span>
                                    </a>
                                </td></tr></table>
                            </td>
                            <td width="20" class="em-mob-wrap em-mob-wrap-cancel">&nbsp;</td>
                            <td width="280" valign="top" class="em-mob-wrap em-mob-wrap-cancel em-mob-width-48perc"></td>
                          </tr></table>
                            <table border="0" cellspacing="0" cellpadding="0" class="em-mob-width-100perc">
                          <tr>
                            <td width="580" valign="middle" class="em-mob-wrap em-mob-width-100perc">
                                        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
                                            <td>
                                                <table cellpadding="0" cellspacing="0" border="0" width="100%" em="atom"><tr><td style="padding-bottom: 5px;">
                                                    <div style="font-family: Helvetica, Arial, sans-serif; font-size: 14px; line-height: 21px; color: #656565;" class="em-font-Inter-Regular">© ${new Date().getFullYear()} ${SITE_NAME}</div>
                                                </td></tr></table><table cellpadding="0" cellspacing="0" border="0" width="100%" em="atom"><tr><td style="padding-bottom: 5px;">
                                                    <div style="font-family: Helvetica, Arial, sans-serif; font-size: 14px; line-height: 21px; color: #656565;" class="em-font-Inter-Regular">Все права защищены.</div>
                                                </td></tr></table>
                                            <table cellpadding="0" cellspacing="0" border="0" width="100%" em="atom"><tr><td align="left" class="em-mob-text-align-left" style="padding-bottom: 20px;">
                                        <a href="mailto:info@vetmed.ru" target="_blank" style="font-family: -apple-system, 'Segoe UI', 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif; font-size: 14px; line-height: 21px; text-decoration: underline; color: #656565;">Поддержка</a>
                                        <span style="font-family: -apple-system, 'Segoe UI', 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif; font-size: 14px; line-height: 21px; color: #A3ADBB;">&nbsp; &nbsp; &nbsp;<a href="${SITE_URL}/newsletter/preferences" target="_blank" style="text-decoration: underline solid; color: #656565;">Настроить подписку</a>&nbsp; &nbsp; &nbsp;<a href="{{UnsubscribeUrl}}" target="_blank" style="text-decoration: underline solid; color: #656565;">Отписаться</a></span>
                                    </td></tr></table></td>
                                            <td>
                    </td>
                                        </tr></table>
                                    </td>
                                </tr></table>
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
    const dateRangeStr = `${format(dateRange.start, 'd MMMM', { locale: ru })} - ${format(dateRange.end, 'd MMMM', { locale: ru })}`;
    const year = format(dateRange.end, 'yyyy');

    // Group articles
    const articlesByCategory: Record<string, NewsletterArticle[]> = {};
    articles.forEach(a => {
        const cat = a.category || 'Другое';
        if (!articlesByCategory[cat]) articlesByCategory[cat] = [];
        articlesByCategory[cat].push(a);
    });

    let content = `
    <!-- Header Block -->
    <tr em="block" class="em-structure">
      <td align="center" style="padding: 20px;" bgcolor="#FFFFFF" class="em-mob-padding_left-20 em-mob-padding_right-20">
        <table border="0" cellspacing="0" cellpadding="0" class="em-mob-width-100perc">
          <tr>
            <td width="300" class="em-mob-wrap em-mob-wrap-cancel em-mob-width-auto">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" em="atom"><tr><td>
                    <a href="${SITE_URL}" style="text-decoration: none; font-size: 28px; font-weight: bold; font-family: Inter, sans-serif; color: #121212;">
                        Vet<span style="color: #0891B2;">Med</span>
                    </a>
                </td></tr></table>
            </td>
            <td width="20" class="em-mob-wrap em-mob-wrap-cancel">&nbsp;</td>
            <td width="300" class="em-mob-wrap em-mob-wrap-cancel em-mob-width-auto">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" em="atom"><tr><td align="right">
                    <table cellpadding="0" cellspacing="0" border="0" class="em-mob-width-100perc">
                        <tr>
                            <td align="center" valign="middle" height="30" style="border-radius: 5px; height: 30px; padding: 0px 40px; border-color: #121212; border-width: 1px; border-style: solid;">
                                <a href="${SITE_URL}/news" target="_blank" style="display: block; width: 100%; height: 30px; font-family: Helvetica, Arial, sans-serif; color: #121212; font-size: 16px; line-height: 30px; text-decoration: none; white-space: nowrap;" class="em-font-Inter-Regular">Все новости</a>
                            </td>
                        </tr></table>
                </td></tr></table>
            </td>
          </tr></table>
      </td>
    </tr>

    <!-- Intro Block -->
    <tr em="block" class="em-structure">
      <td align="center" style="padding: 20px; background-color: #ffffff;" class="em-mob-padding_left-20 em-mob-padding_right-20" bgcolor="#FFFFFF">
        <table border="0" cellspacing="0" cellpadding="0" class="em-mob-width-100perc">
          <tr>
            <td width="620" valign="top" class="em-mob-wrap em-mob-width-100perc">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" em="atom"><tr><td style="padding-bottom: 2px;">
                  <div style="font-family: Helvetica, Arial, sans-serif; font-size: 16px; line-height: 21px; color: #121212; text-transform: uppercase;" class="em-font-Inter-Regular">Дайджест <br></div>
                </td></tr></table>
                <table cellpadding="0" cellspacing="0" border="0" width="100%" em="atom"><tr><td style="padding-bottom: 10px;">
                  <div style="font-family: Helvetica, Arial, sans-serif; font-size: 16px; line-height: 21px; color: #121212; text-transform: uppercase;" class="em-font-Inter-Regular">${dateRangeStr} ${year}<br></div>
                </td></tr></table>
                <table cellpadding="0" cellspacing="0" border="0" width="100%" em="atom"><tr><td style="padding-bottom: 10px;">
                  <div style="font-family: Helvetica, Arial, sans-serif; font-size: 16px; line-height: 21px; color: #121212;" class="em-font-Inter-Regular">
                    Главные события ветеринарной медицины за неделю. Мы собрали для вас самые важные новости и обновления.
                  </div>
                </td></tr></table>
            </td>
          </tr></table>
      </td>
    </tr>
    `;

    // Articles Blocks
    for (const [category, catArticles] of Object.entries(articlesByCategory)) {
        for (const article of catArticles) {
            const imageUrl = article.imageUrl || '';
            const articleContent = `
            <tr em="block" class="em-structure">
              <td align="center" style="padding: 20px; background-color: #ffffff;" class="em-mob-padding_left-20 em-mob-padding_right-20" bgcolor="#FFFFFF">
                <table border="0" cellspacing="0" cellpadding="0" class="em-mob-width-100perc">
                  <tr>
                    ${imageUrl ? `
                    <td width="300" valign="top" class="em-mob-wrap em-mob-width-100perc">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%" em="atom"><tr><td>
                          <img src="${imageUrl}" width="300" border="0" alt="" style="display: block; width: 100%; max-width: 300px; border-radius: 4px;">
                        </td></tr></table>
                    </td>
                    <td width="20" class="em-mob-wrap"></td>
                    ` : ''}
                    <td width="${imageUrl ? '300' : '620'}" valign="top" class="em-mob-wrap em-mob-width-100perc">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%" em="atom"><tr><td style="padding-right: 0px; padding-bottom: 20px; padding-left: 0px;" class="em-mob-padding_top-15">
                          <div style="font-family: Helvetica, Arial, sans-serif; font-size: 18px; line-height: 28px; color: #121212; text-transform: uppercase;" class="em-font-Inter-Regular"><strong>${article.title}</strong></div>
                        </td></tr></table>
                        ${article.excerpt ? `
                        <table cellpadding="0" cellspacing="0" border="0" width="100%" em="atom"><tr><td style="padding-bottom: 20px;">
                          <div style="font-family: Helvetica, Arial, sans-serif; font-size: 16px; line-height: 21px; color: #121212;" class="em-font-Inter-Regular">${article.excerpt}</div>
                        </td></tr></table>
                        ` : ''}
                        <table cellpadding="0" cellspacing="0" border="0" width="100%" em="atom"><tr><td align="${imageUrl ? 'right' : 'left'}">
                                <table cellpadding="0" cellspacing="0" border="0" class="${imageUrl ? '' : 'em-mob-width-auto'}">
                                    <tr>
                                        <td align="center" valign="middle" height="30" style="border-radius: 5px; height: 30px; padding: 0px 40px; border-color: #121212; border-width: 1px; border-style: solid;">
                                            <a href="${article.url}" target="_blank" style="display: block; width: 100%; height: 30px; font-family: Helvetica, Arial, sans-serif; color: #121212; font-size: 16px; line-height: 30px; text-decoration: none; white-space: nowrap;" class="em-font-Inter-Regular">ЧИТАТЬ</a>
                                        </td>
                                    </tr></table>
                            </td></tr></table>
                    </td>
                  </tr></table>
              </td>
            </tr>
            `;
            content += articleContent;
        }
    }

    return BASE_TEMPLATE(digest.subject, digest.preheader, content);
}

export function generateNotificationHtml(article: {
    title: string;
    excerpt?: string | null;
    imageUrl?: string | null;
    url: string;
    category?: string | null;
}): string {
    const subject = `Новая статья: ${article.title}`;
    const preheader = article.excerpt ? article.excerpt.substring(0, 100) : 'Читайте новую статью на VetMed';

    const content = `
    <!-- Header Block -->
    <tr em="block" class="em-structure">
      <td align="center" style="padding: 20px;" bgcolor="#FFFFFF" class="em-mob-padding_left-20 em-mob-padding_right-20">
        <table border="0" cellspacing="0" cellpadding="0" class="em-mob-width-100perc">
          <tr>
            <td width="300" class="em-mob-wrap em-mob-wrap-cancel em-mob-width-auto">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" em="atom"><tr><td>
                    <a href="${SITE_URL}" style="text-decoration: none; font-size: 28px; font-weight: bold; font-family: Inter, sans-serif; color: #121212;">
                        Vet<span style="color: #0891B2;">Med</span>
                    </a>
                </td></tr></table>
            </td>
            <td width="20" class="em-mob-wrap em-mob-wrap-cancel">&nbsp;</td>
            <td width="300" class="em-mob-wrap em-mob-wrap-cancel em-mob-width-auto">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" em="atom"><tr><td align="right">
                    <table cellpadding="0" cellspacing="0" border="0" class="em-mob-width-100perc">
                        <tr>
                            <td align="center" valign="middle" height="30" style="border-radius: 5px; height: 30px; padding: 0px 40px; border-color: #121212; border-width: 1px; border-style: solid;">
                                <a href="${SITE_URL}/news" target="_blank" style="display: block; width: 100%; height: 30px; font-family: Helvetica, Arial, sans-serif; color: #121212; font-size: 16px; line-height: 30px; text-decoration: none; white-space: nowrap;" class="em-font-Inter-Regular">Все новости</a>
                            </td>
                        </tr></table>
                </td></tr></table>
            </td>
          </tr></table>
      </td>
    </tr>

    <!-- Content Block -->
    <tr em="block" class="em-structure">
      <td align="center" style="padding: 20px; background-color: #ffffff;" class="em-mob-padding_left-20 em-mob-padding_right-20" bgcolor="#FFFFFF">
        <table border="0" cellspacing="0" cellpadding="0" class="em-mob-width-100perc">
          <tr>
            <td width="620" valign="top" class="em-mob-wrap em-mob-width-100perc">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" em="atom"><tr><td style="padding-bottom: 2px;">
                  <div style="font-family: Helvetica, Arial, sans-serif; font-size: 16px; line-height: 21px; color: #10b981; text-transform: uppercase;" class="em-font-Inter-Regular">${article.category || 'НОВОСТЬ'}<br></div>
                </td></tr></table>
                <table cellpadding="0" cellspacing="0" border="0" width="100%" em="atom"><tr><td style="padding-bottom: 20px; padding-top: 10px;">
                  <div style="font-family: Helvetica, Arial, sans-serif; font-size: 24px; line-height: 32px; color: #121212; text-transform: uppercase;" class="em-font-Inter-Regular"><strong>${article.title}</strong><br></div>
                </td></tr></table>
                
                ${article.imageUrl ? `
                <table cellpadding="0" cellspacing="0" border="0" width="100%" em="atom"><tr><td style="padding-bottom: 20px;">
                  <img src="${article.imageUrl}" width="620" border="0" alt="" style="display: block; width: 100%; max-width: 620px; border-radius: 4px;">
                </td></tr></table>
                ` : ''}

                ${article.excerpt ? `
                <table cellpadding="0" cellspacing="0" border="0" width="100%" em="atom"><tr><td style="padding-bottom: 20px;">
                  <div style="font-family: Helvetica, Arial, sans-serif; font-size: 18px; line-height: 26px; color: #121212;" class="em-font-Inter-Regular">${article.excerpt}</div>
                </td></tr></table>
                ` : ''}
                
                <table cellpadding="0" cellspacing="0" border="0" width="100%" em="atom"><tr><td align="center" style="padding-top: 20px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td align="center" valign="middle" height="40" style="border-radius: 5px; height: 40px; padding: 0px 50px; background-color: #10b981; border: 1px solid #10b981;">
                                <a href="${article.url}" target="_blank" style="display: block; width: 100%; height: 40px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; font-size: 16px; line-height: 40px; text-decoration: none; white-space: nowrap; font-weight: bold;" class="em-font-Inter-Regular">ЧИТАТЬ ПОЛНОСТЬЮ</a>
                            </td>
                        </tr></table>
                </td></tr></table>
            </td>
          </tr></table>
      </td>
    </tr>
    `;

    return BASE_TEMPLATE(subject, preheader, content);
}
