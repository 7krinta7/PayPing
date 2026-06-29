const brevo = require("@getbrevo/brevo");

const apiInstance = new brevo.TransactionalEmailsApi();

apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

const sendEmail = async (to, subject, text) => {
  try {
    const result = await apiInstance.sendTransacEmail({
      sender: {
        name: "PayPing",
        email: "krishkrm07@gmail.com",
      },
      to: [
        {
          email: to,
        },
      ],
      subject,
      textContent: text,
    });

    console.log("Brevo email sent:", result.body);
  } catch (err) {
    console.error(
      "Brevo Error:",
      err.response?.body || err.message || err
    );
    throw err;
  }
};

module.exports = sendEmail;