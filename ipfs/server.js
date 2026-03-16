import express from "express";
import multer from "multer";
import cors from "cors";
import { uploadFile } from "./main.js";
import { create } from "ipfs-http-client";
import bcrypt from "bcrypt"
import connect from "./dbconnect.js"
import jwt from "jsonwebtoken"
connect(process.env.MONGODB || "mongodb://localhost:27017/sih")
const app = express();


import User from "./user.model.js";
import Officials from "./army.model.js";
// Middleware
app.use(cors(
  {
    credentials: true,
    origin: "http://localhost:5173"
  }
));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// File upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  console.log('Received file upload');
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const cid = await uploadFile(req.file.buffer);
    res.json({
      message: "File uploaded successfully",
      cid,
      url: `https://ipfs.io/ipfs/${cid}`,
      status: !!cid
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error uploading file" });
  }
});

// Text upload endpoint
app.post('/uploadtext', async (req, res) => {
  try {
    const text = req.body.message;
    if (!text) return res.status(400).json({ message: "No text uploaded" });

    const client = create({ url: "http://127.0.0.1:5001" });
    const buffer = Buffer.from(text, "utf-8");

    const result = await client.add(buffer);

    console.log("✅ Text uploaded!");
    console.log("CID:", result.cid.toString());
    console.log("Gateway URL: https://ipfs.io/ipfs/" + result.cid.toString());

    res.json({
      message: "Text uploaded successfully",
      cid: result.cid.toString(),
      url: `https://ipfs.io/ipfs/${result.cid.toString()}`,
      status: !!result.cid.toString()
    });

  } catch (err) {
    console.error("❌ Error uploading text:", err);
    res.status(500).json({ message: "Error uploading text", error: err.message });
  }
});

// Root

import sendMail from "./mail.js";
app.post('/sendmail', async (req, res) => {
  console.log('in the mail')
  console.log(req.body)
  const to = req.body?.to || 'adityakuraniyt@gmail.com'
  // here is the governemnt mail
  const subject = req.body?.subject || 'Mail reporting urgent threats'
  const text = req.body?.text || 'this is the body of the threats'

  const response = await sendMail(to, subject, text)
  console.log(response)
  res.json({ status: true, data: response })
})

import aires from './gemini.js'

app.post('/gemini', async (req, res) => {
  try {
    console.log('Received prompt:', req.body.prompt);
    const response = await aires(req.body.prompt);
    console.log(response)
    res.json({ status: true, data: response.steps });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, error: 'Server error' });
  }
});
app.post('/register', async (req, res) => {
  const { name, email, password } = req?.body
  const alreadyexist = await User.findOne({ $or: [{ email: email }, { name: name }] })
  console.log(req.body)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (alreadyexist) {
    return res.status(400).json({ message: "user already exists" })
  }
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }
  if (!name.trim() || !email.trim() || !password.trim()) {
    return res.status(400).json({ message: "all fields are required" })
  }
  const hashedpassword = await bcrypt.hash(password, 10)
  const newuser = await User.create({ name, email, password: hashedpassword })
  await newuser.save()
  if (newuser) {
    const token = jwt.sign({ id: newuser._id }, process.env.SECRET_KEY);
    res.status(200).json({ newuser, token })

    res.cookie('logintoken', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 120 * 60 * 60 * 1000
    });
    return res.status(200).json({
      token,
      message: "User registered successfully"
    })
  }
})
app.post('/loginuser', async (req, res) => {
  const { email, password } = req?.body
  console.log(req.body)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return res.status(400).json({ msg: "invalid email" })
  }
  if (!email.trim() || !password.trim()) {
    return res.status(400).json({ msg: "all fields are required" })
  }
  const user = await User.findOne({ email: email })
  if (!user) {
    console.log("user not found")
    return res.status(404).json({ msg: "user not found" })
  }
  const secretkey = process.env.SECRET_KEY
  const token = jwt.sign({ id: user._id }, secretkey)

  const ispasswordcorrect = await bcrypt.compare(password, user.password)
  if (ispasswordcorrect) {
    res.cookie('logintoken', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 120 * 60 * 60 * 1000
    });
    res.status(200).json({ msg: "Login success redirecting to upload...", email: user.email, name: user.name, token: token })

  }
  else {
    res.status(401).json({ msg: "Wrong Password !!!" })
  }
})

app.post('/loginofficial', async (req, res) => {
  const { department, officialId, securityCode, password } = req?.body
  console.log(req.body)


  const official = await Officials.findOne({ officialId: officialId })
  if (!official) {
    return res.status(404).json({ message: "official not found" })
  }
  const secretkey = process.env.SECRET_KEY
  const token = jwt.sign({ id: official._id }, secretkey)
  res.cookie('logintoken', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    maxAge: 120 * 60 * 60 * 1000
  })
  if (password === official.password) {
    res.status(200).json({ msg: "Login success redirecting to upload...", official: official, token: token })
  }
  else {
    res.status(401).json({ msg: "Wrong Password !!!" })
  }
})
import cookieParser from "cookie-parser";
app.use(cookieParser());

app.get('/getcredentials', async (req, res) => {
  const token = req.cookies.logintoken;
  if (!token) {
    return res.status(401).json({ msg: "No token, please login" });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const id = decoded.id
    console.log(id)
    const userfromdb = await User.findById(id).select("-password")
    res.json({ msg: "Valid token", userfromdb });
  } catch (err) {
    res.status(401).json({ msg: "Invalid or expired token" });
  }
});


app.get('/logout', async (req, res) => {
  res.clearCookie('logintoken');
  console.log('in th elogotu ')
  if (!res.clearCookie('logintoken')) {
    return res.status(401).json({ msg: "No token, please login" });
  }
  res.status(200).json({ status: true, msg: "Logout successful" });
});
import OTPservice from './twilio.js'
const hashmap = {}
app.post('/sendotp', async (req, res) => {
  const { number } = req.body
  if (hashmap[number] && Date.now() < hashmap[number]) {
    return res.status(429).json({ msg: "You can only send OTP once every 60 seconds" })
  }
  const num = (number.split('-').join(""))
  try {
    console.log('in the sending ')
    await OTPservice.sendOtp(num)

    hashmap[number] = Date.now() + 60000
    return res.status(200).json({ msg: "OTP sent successfully" })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ msg: "Failed to send OTP" })
  }
})
app.post('/verifyotp', async (req, res) => {
  const { number, code } = req.body
  console.log(number, code)
  try {
    const response = await OTPservice.verifyOTP(number, code)
    if (!response) {
      return res.status(400).json({ msg: "Failed to verify OTP" })
    }
    return res.status(200).json({ msg: "OTP verified successfully" })
  } catch (err) {
    console.log(err)
    return res.status(500).json({ msg: "Failed to verify OTP" })
  }
})
app.post('/', (req, res) => res.json({ message: "success" }));

app.listen(8000, () => console.log("Server running on http://localhost:8000"));
