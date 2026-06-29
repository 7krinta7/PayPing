const { BrevoClient } = require("@getbrevo/brevo");

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

const sendEmail = async (to, subject, text) => {
  try {
    const result = await brevo.transactionalEmails.sendTransacEmail({
      sender: {
            name: process.env.BREVO_SENDER_NAME,
            email: process.env.BREVO_SENDER_EMAIL,
      },
      to: [{ email: to }],
      subject,
      textContent: text,
    });

    console.log("Brevo email sent:", result.messageId || result);
  } catch (err) {
    console.error("Brevo Error:", err);
    throw err;
  }
};

module.exports = sendEmail;