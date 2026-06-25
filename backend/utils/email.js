const nodemailer = require("nodemailer");

function buildTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false, // true for port 465, false for 587 (STARTTLS)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function sendPasswordResetEmail(toEmail, resetUrl) {
  const transporter = buildTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: "Reset your Mandisa Nailed It admin password",
    html: `
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
  });
}

module.exports = { sendPasswordResetEmail };
