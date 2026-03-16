// sendMail.js
import dotenv from 'dotenv'
dotenv.config()
import nodemailer from 'nodemailer'

async function sendMail(to, subject, text, html="" ) {
  // Create transporter using SMTP (Gmail example)
  const user= 'friendify.network@gmail.com'
  const pass='eheo wdub ukgh bwdn'
  const transporter = nodemailer.createTransport({
    service: 'gmail', // or use host/port/auth for other providers
    auth: {
      user: user,
      pass: pass
    }
  });

  const mailOptions = {
    from: `${user}`,
    to,         // single email or comma-separated
    subject,
    text,       // plain text fallback
    html        // optional HTML body
    // attachments: [{ filename: 'file.txt', path: './file.txt' }]
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent:', info.messageId);
    return info;
  } catch (err) {
    console.error('Error sending mail:', err);
    throw err;
  }
}

// // Example usage:
// (async () => {
//   try {
//     await sendMail({
//       to: 'adityakurani87@gmail.com',
//       subject: 'Hello from Node.js!',
//       text: 'This is a plain-text fallback body.',
//       html: `<p>Hey — this is an <b>HTML</b> email from Node.js!</p>`
//     });
//     console.log('Email successfully sent.');
//   } catch (e) {
//     console.error('Failed:', e.message);
//   }
// })();
export default sendMail