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
    if (process.env.NODE_ENV === "production") {
      // TODO: implement sendgrid
      return 1;
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
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    // Define the email options
    const mailOptions = {
      from: this.from,
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
};

// // options will contain the email address where we want to send the email to, the subject line, email content, etc
// const sendEmail = async (options) => {
//   // 1) Create a transporter. The transporter is a service that will actually send the email because it's not node js sending the email. It's just the service we define like Gmail.
//   const transporter = nodemailer.createTransport({
//     // If you're gonna use gmail, in your account, you're gonna have to activate something called the less secure app option
//     // But the reason why we don't use gmail is because it's not good for a production app. You can only send 500 per day and will be quickly marked as a spammer
//     // Instead, we can use SendGrid or MailGun. Right now, we will use a special development service(MailTrap) which basically fakes to send emails to real addresses but in reality, these emails end up trapped in a development inbox so then we can take a look how they will look later in production.
//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT,
//     auth: {
//       user: process.env.EMAIL_USERNAME,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//   });

//   // 2) Define the email options
//   const mailOptions = {
//     // name then email address
//     from: "John Daniel S <jdanielsemine@gmail.com>",
//     to: options.email,
//     subject: options.subject,
//     text: options.message,
//     // html - we can specify the HTML property and convert the message to HTMl but that will be done later
//   };

//   // 3) Actually send the email
//   await transporter.sendMail(mailOptions);
// };

// module.exports = sendEmail;
