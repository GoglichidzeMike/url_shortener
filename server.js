require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const validUrl = require("valid-url");
const nanoid = require("nanoid");
const { doesNotMatch } = require("assert");

// Basic Configuration
app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));
app.use(express.urlencoded({ extended: true }));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

//connecting to mongodb
const dbURI = process.env.MONGO_URI;
mongoose
  .connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((results) => app.listen(3000))
  .catch((err) => console.log(err));

const connection = mongoose.connection;

connection.on("error", console.error.bind(console, "connection error:"));
connection.once("open", () => {
  console.log("Connected to mongodb");
});

//define schema

const Schema = mongoose.Schema;

const urlSchema = new Schema({
  original_url: String,
  short_url: String,
});

const URL = mongoose.model("URL", urlSchema);

/// create request routes here

app.post("/api/shorturl/new", async (req, res) => {
  //get url
  const newUrl = req.body.url;
  //create id
  const id = nanoid.customAlphabet("1234567890", 6);
  const shortUrl = id();

  //check if the url is valid

  if (!validUrl.isWebUri(newUrl)) {
    res.status(401).json({
      error: "invalid url",
    });
  } else {
    //check if the url already exists
    try {
      let findOne = await URL.findOne({
        original_url: newUrl,
      });

      //if it does, return it
      if (findOne) {
        res.json({
          original_url: findOne.original_url,
          short_url: findOne.short_url,
        });
      } else {
        //if it doesnt, add new url using the URL mongoose model.
        findOne = new URL({
          original_url: newUrl,
          short_url: shortUrl,
        });

        await findOne.save();
        res.json({
          original_url: findOne.original_url,
          short_url: findOne.short_url,
        });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json("server error...");
    }
  }
});

app.get("/api/shorturl/:short_url", async (req, res) => {
  try {
    const urlParams = await URL.findOne({
      short_url: req.params.short_url,
    });
    if (urlParams) {
      return res.redirect(urlParams.original_url);
    } else {
      return res.status(404).json("No URL Found");
    }
  } catch (err) {
    console.error(err);
    res.status(500).json("Server error");
  }
});
