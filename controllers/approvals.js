//Packages to connect postgresql DB
const pkg = require("pg");
const { Client } = pkg;
const moment = require("moment");
const dotenv = require("dotenv"); //package to use dotenv
// const { user } = require("pg/lib/defaults");

// Set up Global configuration access
dotenv.config();
credentials = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};

exports.myApprovals = async (req, res) => {
    let {approver} = req.query
    
}



