//Packages to connect postgresql DB
const pkg = require("pg");
const { Client } = pkg;
const dotenv = require("dotenv"); //package to use dotenv
const bcrypt = require("bcrypt");
const { default: axios } = require("axios");

dotenv.config();
credentials = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};

exports.get_sales_order = async (req, res) => {
    let { so_id } = req.body;
    console.log(so_id)
    let organization_id = 60006587985;
    let refresh_token ="1000.9cefe569ffa61fa3bdeeba175cff799f.2ac9c95060278532745fa85eff463e83";
    let client_id = "1000.ZNQ9ZUU1FV555C8L6F6XCJQ3OBO99D";
    let client_secret = "f072691d90ecc62dd5b01ec098ecb8f380f00594ec";
    let usertoken_url = `https://accounts.zoho.in/oauth/v2/token?refresh_token=${refresh_token}&client_id=${client_id}&client_secret=${client_secret}&grant_type=refresh_token`;

    // creating the token for zoho authorisation ////////////////////////////////////////////ZOHO API
  
    let resp = await axios.post(usertoken_url).catch(error => console.log(error))
    let token = resp.data.access_token;
    // api to check whether a contact is present in database ////////////////////////////////ZOHO API
    let so_url = `https://books.zoho.in/api/v3/salesorders/${so_id}?organization_id=${organization_id}&accept=pdf`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Zoho-oauthtoken ${token}`,
      },
    };
    client.end()
    let result = await axios.post(so_url,config).catch(err => res.send(err))
    
}