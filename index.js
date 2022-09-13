const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const userRoute = require("./routes/oms");

// Set up Global configuration access
dotenv.config();

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT;
const app = express();

app.use(express.json());

const corsOpts = {
  origin: '*',

  methods: [
    'GET',
    'POST',
  ],

  allowedHeaders: [
    'Content-Type',
  ],
};

app.use(cors(corsOpts));
app.use(express.urlencoded({ extended: true })); ///to accept formURLencoded data

app.use(express.static("public"));

////////////////////////////////////////////////////////Base URL connection test/////////////////////////////////////////////////////
app.get("/", (req, res) => {
  res.send("Hello from OMS dashboard backend Cloud run service");
});

///////////////////////////////////////////////////////////// Routes ///////////////////////////////////////////////////////////////
app.use("/api/v1", userRoute);

app.listen(PORT, () => console.log(`aqai-node-server-started in port ${PORT}`));
