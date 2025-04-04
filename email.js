// mail.js is a file that contains the function to send an email to the user.
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  },
}); 

const send = (email, subject, text, html, cb) => {
  const mailOptions = {
    from: `Auxin Pvt <${process.env.EMAIL}>`,
    to: email,
    subject,
    text,
    html
  };

  transporter.sendMail(mailOptions, (err, data) => {
    if (err) {
      cb(err, null);
    } else {
      cb(null, data);
    }
  });
};

module.exports = { send };