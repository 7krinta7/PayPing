const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
  logger: true,
  debug: true,
});

const sendEmail = async (to, subject, text) => {
  try {
    console.log("Verifying SMTP...");
    await transporter.verify();
    console.log("SMTP verified.");

    console.log("Sending email...");
    const info = await transporter.sendMail({
      from: `"PayPing" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });

    console.log("Email sent:", info.messageId);
  } catch (err) {
    console.error("========== SMTP ERROR ==========");
    console.error(err);
    console.error("Code:", err.code);
    console.error("Command:", err.command);
    console.error("Response:", err.response);
    console.error("================================");
    throw err;
  }
};

module.exports = sendEmail;