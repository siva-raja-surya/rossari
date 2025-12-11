const { MailtrapClient } = require("mailtrap");

const mailSender = async (email, title, body, subject, ccemail = []) => {
  try {
    const TOKEN = process.env.MAILTRAP_TOKEN;
    const ENDPOINT = process.env.MAILTRAP_ENDPOINT;

    const client = new MailtrapClient({ endpoint: ENDPOINT, token: TOKEN });

    const sender = {
      email: "app.dev@gcitsolutions.com",
      name: "GCIT",
    };

    email = email.filter(
      (value, index, self) =>
        index === self.findIndex((obj) => obj.email === value.email)
    );
    ccemail = ccemail.filter(
      (item) => !email.some((remItem) => remItem.email === item.email)
    );
    ccemail = ccemail.filter(
      (value, index, self) =>
        index === self.findIndex((obj) => obj.email === value.email)
    );
    const info = await client.send({
      from: sender,
      to: email,
      cc: ccemail,
      subject: subject,
      html: `${body}`,
      category: "GoProton",
    });
    return {
      success: true,
    };
  } catch (error) {
    console.log(error.message);
    return {
      success: false,
      message: error.message,
    };
  }
};

module.exports = mailSender;
