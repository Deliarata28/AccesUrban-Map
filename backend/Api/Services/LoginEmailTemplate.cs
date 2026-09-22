using System.Net;

namespace AccesUrbanMap.Api.Services;

public static class LoginEmailTemplate
{
    public static string Create(string recipientName, string code)
    {
        var safeName = WebUtility.HtmlEncode(recipientName.Trim());
        var safeCode = WebUtility.HtmlEncode(code);

        return $"""
            <!doctype html>
            <html lang="ro">
              <body style="margin:0;padding:0;background:#f5f1e9;color:#24385f;font-family:Arial,Helvetica,sans-serif;">
                <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">Codul tău AccesUrban Map este {code}. Valabil 1 minut.</span>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f5f1e9;padding:32px 12px;">
                  <tr>
                    <td align="center">
                      <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;border:1px solid #d7e0ef;border-radius:22px;overflow:hidden;background:#fffdfa;">
                        <tr>
                          <td style="padding:24px 28px;background:#163b83;color:#ffffff;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                              <tr>
                                <td style="width:44px;height:44px;">
                                  <img src="cid:accesurban-logo" width="44" height="44" alt="AccesUrban Map" style="display:block;width:44px;height:44px;border:0;outline:none;text-decoration:none;" />
                                </td>
                                <td style="padding-left:12px;">
                                  <div style="font-size:18px;font-weight:700;line-height:22px;">AccesUrban Map</div>
                                  <div style="margin-top:2px;color:#dce8ff;font-size:12px;line-height:16px;">Chișinău fără bariere</div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:34px 34px 28px;">
                            <h1 style="margin:10px 0 10px;color:#163b83;font-size:28px;font-weight:700;letter-spacing:-0.4px;line-height:34px;">Confirmă conectarea</h1>
                            <p style="margin:0;color:#5f6877;font-size:15px;line-height:23px;">Bună, {safeName}! Introdu codul de mai jos în aplicație pentru a continua în siguranță.</p>
                            <div style="margin:28px auto 7px;padding:17px 20px;border:1px solid #b9c9e5;border-radius:14px;color:#163b83;background:#f4f8ff;font-family:'Courier New',Courier,monospace;font-size:30px;font-weight:700;letter-spacing:7px;line-height:36px;text-align:center;user-select:all;">{safeCode}</div>
                            <p style="margin:0 0 20px;color:#5f6877;font-size:12px;line-height:19px;text-align:center;">Selectează codul și copiază-l. Pe telefon, ține apăsat pe el.</p>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-radius:12px;background:#eef4ff;">
                              <tr>
                                <td style="padding:14px 16px;color:#31527f;font-size:13px;line-height:20px;">
                                  <strong style="color:#163b83;">Valabil 1 minut.</strong> Codul poate fi folosit o singură dată.
                                </td>
                              </tr>
                            </table>
                            <p style="margin:22px 0 0;color:#7c8491;font-size:12px;line-height:19px;">Dacă nu ai cerut conectarea, poți ignora acest email. Nu distribui codul nimănui.</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:18px 34px;border-top:1px solid #e5e9f0;color:#7c8491;font-size:12px;line-height:18px;">AccesUrban Map · informații mai clare pentru deplasări fără bariere</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            """;
    }
}
