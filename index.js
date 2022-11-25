const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());



app.get("/", async (req, res) => {
  res.send("Beche Fel server is running");
});
app.listen(port, () => {
  console.log(`Beche Fel is running on ${port}`);
});
