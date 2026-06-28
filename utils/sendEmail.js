const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

    console.log("Sending email to:", to);

  const info = await transporter.sendMail({
    from: `"PayPing" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  });

  console.log("Email sent:", info.messageId);
};

module.exports = sendEmail;