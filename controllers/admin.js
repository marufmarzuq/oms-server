//Packages to connect postgresql DB
const pkg = require("pg");
const { Client } = pkg;
const dotenv = require("dotenv"); //package to use dotenv
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");

// Set up Global configuration access
dotenv.config();
credentials = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};
let salt = 12;

exports.login = async (req, res) => {
  const { user_details } = req.body;
  let query = `SELECT * FROM aqai.admins WHERE email = '${user_details["username"]}'`;
  const client = new Client(credentials);
  client.connect();
  let result = await client.query(query);
  let user = result.rows[0];
  let actual_email = user.email;
  let user_email = user_details["username"];
  let entered_password = user_details["password"];
  let password_check = await bcrypt.compare(entered_password, user.password);
  if (password_check) {
    const token = jwt.sign(actual_email, process.env.secret_key);
    client.end()
    res.status(201).send({
      status: true,
      msg: "Successfully logged in",
      data: { token: token, user: user.email, zoho_id: user.zoho_id,name:user.name },
    });
  }
  if(!password_check){ 
    client.end()
    res
      .status(500)
      .send({ status: false, msg: "Please check your login credentials" });
  }
};

exports.forgot_password = async (req, res) => {
  const { email } = req.body;
  let otp = Math.floor(Math.random() * 899999 + 100000);
  otp = JSON.stringify(otp);
  let hashed_otp = await bcrypt.hash(otp, salt);
  console.log(otp);
  const client = new Client(credentials);
  client.connect();
  let query = `UPDATE aqai.admins SET password_reset_otp ='${hashed_otp}' WHERE email ='${email}' returning *`;
  let result = await client.query(query).catch((err) => {
    res.status(500).send({ status: false, msg: " Something went wrong" });
  });
  if (result) {
    if (result.rows.length == 0) {
      res
        .status(404)
        .send({ status: false, msg: "No user found with this email" });
    }
    if (result.rows.length) {
      // send email //
      let data = JSON.stringify({
        to: email,
        subject: "AQAI Registration OTP",
        html: `Your AQAI Login OTP is ${otp}`,
      });

      let config = {
        method: "post",
        url: "https://message-node-adk24f4fea-uc.a.run.app/api/v1/email",
        headers: {
          Authorization: "Basic YXFhaUFQSTphcWFpQGduaWdhc3NlbQ==",
          "Content-Type": "application/json",
        },
        data: data,
      };

      let mail = axios(config).catch(function (error) {
        console.error(error);
      });
      client.end()
      res.status(200).send({
        status: true,
        msg: "OTP has been sent to the email . Please redirect",
      });
    }
  }
};

exports.change_password = async (req, res) => {
  let { email, otp, password } = req.body;
  const client = new Client(credentials);
  client.connect();

  // CHECK for the user presenece in database
  let query = `SELECT * FROM aqai.admins WHERE email = '${email}'`;
  let result = await client.query(query).catch((err) => console.log(err));
  result.rows.length == 0 &&
    res.status(404).send({ status: false, msg: "Please check your email" });
  if (result.rows.length) {
    let user = result.rows[0];

    // compare the otp entered by user
    otp = JSON.stringify(otp);
    let comparison = bcrypt.compare(otp, user.password_reset_otp);
    if (comparison) {
      //  save the password generate token as in login
      let hashed_password = await bcrypt.hash(password, salt);
      let password_update_query = `UPDATE aqai.admins SET password = '${hashed_password}', password_reset_otp = null
       WHERE email ='${email}' returning id`;
      let response = await client.query(password_update_query).catch((err) => {
        client.end()
        res.status(500).send({ status: false, msg: "Something went wrong" });
      });
      if(response.rows.length == 0){
        client.end()
        res
          .status(404)
          .send({ status: false, msg: "No user found with this email" });
      }
        
      if(response.rows.length){
        client.end()
        res.status(200).send({
          status: true,
          msg: "Password successfully changed. Please redirect",
        });
    }
  }
  }
};
