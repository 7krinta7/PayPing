const nodemailer = require("nodemailer");

await transporter.verify();
console.log("SMTP connection successful");
const sendEmail = async (to, subject, text) => {
  const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
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