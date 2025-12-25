require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const app = express();
const session = require("express-session");
const User = require("./models/User.js");
const port = 3000;

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/buysellhub")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err));

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/login", async (req, res) => {
  const { email,password}=req.body
  const user = await User.findOne({email})
  if(!user){
    res.send('No user detected with this email')
  }
  console.log("Login attempt", email);
  res.send(`Login : ${email}`);
});
app.post('/signup', async (req, res) => {
  try {
    console.log('SIGNUP BODY:', req.body);  // 1) check form data reaches server

    const user = new User(req.body);
    const savedUser = await user.save();     // 2) may throw

    console.log('SAVED USER:', savedUser);   // 3) should appear if success
    res.send(`✅ ${savedUser.name} created!`);
  } catch (err) {
    console.error('SIGNUP ERROR:', err);     // 4) see exact cause
    res.send('Email already exists');
  }
});

app.listen(port, () => {
  console.log(`BuySellHub on http://localhost:${port}`);
});
