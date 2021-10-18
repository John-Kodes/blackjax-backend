const nodemailer = require("nodemailer");
const pug = require("pug");
const { htmlToText } = require("html-to-text");

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.username;
    this.url = url;
    this.from = `John Daniel <${process.env.EMAIL_FROM}>`;
  }

  _newTransport() {
    console.log("bruh", process.env.NODE_ENV);
    if (process.env.NODE_ENV === "production") {
      return nodemailer.createTransport({
        service: "SendGrid",
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async send(template, subject) {
    // Render HTML
    const html = pug.renderFile(`${__dirname}/../views/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    // Define the email options
    const mailOptions = {
      from:
        process.env.NODE_ENV === "production"
          ? process.env.SENDGRID_EMAIL_FROM
          : this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText(html),
    };

    // Create transport and send email
    await this._newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send("welcome", "Welcome to BlackJax!");
  }

  async sendResetPassword() {
    await this.send("passwordReset", "BlackJax password reset");
  }
};
