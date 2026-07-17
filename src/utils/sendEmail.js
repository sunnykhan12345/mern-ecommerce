import nodemailer from "nodemailer";

const createTransporter = () => {
  const { EMAIL_USER, EMAIL_PASS, EMAIL_HOST, EMAIL_PORT } = process.env;

  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error(
      "EMAIL_USER and EMAIL_PASS must be set in the environment to send emails.",
    );
  }

  if (EMAIL_HOST) {
    return nodemailer.createTransport({
      host: EMAIL_HOST,
      port: Number(EMAIL_PORT) || 587,
      secure: Number(EMAIL_PORT) === 465,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
};

const buildOtpEmailHtml = ({ name, otp }) => {
  const safeName = name || "there";

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Password Reset OTP</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#0f172a;padding:24px 28px;">
                <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Password Reset</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 12px;color:#111827;font-size:16px;">Hi ${safeName},</p>
                <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.6;">
                  Use the one-time password below to reset your account password.
                  This code expires in <strong>10 minutes</strong>.
                </p>
                <div style="text-align:center;margin:28px 0;">
                  <span style="display:inline-block;letter-spacing:8px;font-size:32px;font-weight:700;color:#0f172a;background:#f1f5f9;padding:14px 22px;border-radius:10px;">
                    ${otp}
                  </span>
                </div>
                <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.5;">
                  If you did not request a password reset, you can safely ignore this email.
                </p>
                <p style="margin:0;color:#9ca3af;font-size:12px;">
                  Do not share this code with anyone.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();
};

export const sendOtpEmail = async ({ to, name, otp }) => {
  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  await transporter.sendMail({
    from,
    to,
    subject: "Your password reset OTP",
    text: `Hi ${name || "there"},\n\nYour password reset OTP is ${otp}. It expires in 10 minutes.\n\nIf you did not request this, ignore this email.`,
    html: buildOtpEmailHtml({ name, otp }),
  });
};

export default sendOtpEmail;
