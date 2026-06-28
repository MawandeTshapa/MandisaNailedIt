// Sends email via Brevo's HTTP API (https://api.brevo.com) instead of raw
// SMTP. Render's free web services block outbound traffic on SMTP ports
// 25/465/587, so Nodemailer-over-SMTP can never connect from this service
// tier. An HTTP API call travels over port 443 like any other request this
// app already makes, so it isn't affected by that restriction.

async function sendPasswordResetEmail(toEmail, resetUrl) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { email: process.env.EMAIL_FROM, name: "Mandisa Nailed It" },
      to: [{ email: toEmail }],
      subject: "Reset your Mandisa Nailed It admin password",
      htmlContent: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#2A1220;">Password reset request</h2>
          <p>We received a request to reset the admin password for Mandisa Nailed It.</p>
          <p>
            <a href="${resetUrl}" style="background:#C9A227;color:#2A1220;padding:12px 20px;
            text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">
              Reset Password
            </a>
          </p>
          <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.message || `Email send failed (${res.status})`);
  }
}

module.exports = { sendPasswordResetEmail };