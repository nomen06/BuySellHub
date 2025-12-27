require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const app = express();
const session = require("express-session");
const User = require("./models/User.js");
const Product = require("./models/Product");
const port = 3000;
const bcrypt = require("bcryptjs");

app.use(
  session({
    secret: process.env.session_secret || "secreeet",
    resave: false,
    saveUninitialized: false,
    cookie:{
      maxAge:1000*60*60
    },
  })
);
app.use((req, res, next) => {
  console.log("SESSION DEBUG:", {
    id: req.sessionID,
    userId: req.session.userId || null,
  });
  next();
});

function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
}

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/buysellhub")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err));

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.currentUserId = req.session.userId || null;

  res.locals.error = req.session.error || null;
  res.locals.success = req.session.success || null;

  req.session.error = null;
  req.session.success = null;
  next();
});

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.send("Logout failed");
    res.redirect("/");
  });
});
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find().populate("seller", "name");
console.log("PRODUCTS COUNT:", products.length);
console.log("LAST PRODUCT:", products[products.length - 1]);
res.render("products", { products });
  } catch (err) {
    console.error("Fetching error: ",err)
    res.status(500).send("server error")
  }
});
app.get("/products/new", (req, res) => {
  if(!req.session.userId){
    req.session.error = "Please login first."
    return res.redirect('/login')
  }
  res.render("products/new");
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      req.session.error = "Email not found,signup first";
      return res.redirect("/login");
    }
    const ismatch = await bcrypt.compare(password, user.password);

    if (!ismatch) {
      req.session.error = "Invalid email or password";
      return res.redirect("/login");
    }
    req.session.userId = user._id;
    req.session.user = {
      name: user.name,
      email: user.email,
    };
    req.session.success = "Successful login";
    res.redirect("/");
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    req.session.error = "Login error,try again.";
    res.send("Login failed");
  }
});

app.post("/products",async (req,res)=>{
  if (!req.session.userId) {
    req.session.error = "You must be logged in first";
    return res.redirect("/login");
  }
  const { price, title, description, imageURL } = req.body;
  if (!price) {
    req.session.error = "Please enter price for item.";
    res.redirect("/products/new");
  } else if (!title) {
    req.session.error = "Please enter the title of item.";
    res.redirect("/products/new");
  } else if (!description) {
    req.session.error = "Some description is required for the item";
    res.redirect("/products/new");
  }
  if (Number(price) < 0) {
    req.session.error = "Price cannot be negative.";
    res.redirect("/products/new");
  }
  try {
    const product = new Product({
      title,
      price,
      description,
      imageURL,
      seller: req.session.userId,
    });
    await product.save()
    req.session.success = "Listing created successfully";
    res.redirect("/products");
  } catch (err) {
    console.log("ERROR SAVE PRODUCT DETAILS:", {
      name: err.name,
      message: err.message,
      errors: err.errors,
    });
    req.session.error = "Error in saving product, Please try again";
    res.redirect("/products/new");
  }
})

app.post("/signup", async (req, res) => {
  try {
    const user = new User(req.body);
    const savedUser = await user.save();
    req.session.success = `Welcome,${savedUser},your signup is successful.You may login now`;
    res.redirect("/login");
  } catch (err) {
    console.error("SIGNUP ERROR:", {
      name: err.name,
      code: err.code,
      message: err.message,
      errors: err.errors,
    });
    if (err.code === 11000) {
      req.session.error = "Email already exists.Please login";
      res.redirect("/login");
    } else {
      req.session.error = "Signup failed.Please try again";
      res.redirect("/signup");
    }
  }
});

app.listen(port, () => {
  console.log(`BuySellHub on http://localhost:${port}`);
});
