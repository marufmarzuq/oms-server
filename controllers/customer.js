//Packages to connect postgresql DB
const pkg = require("pg");
const { Client } = pkg;
const moment = require("moment");
const dotenv = require("dotenv"); //package to use dotenv
const { user } = require("pg/lib/defaults");

// Set up Global configuration access
dotenv.config();
credentials = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};

exports.add_customer = async (req, res) => {
  const { user_details } = req.body;
  console.log(user_details)
  const client = new Client(credentials);
  client.connect();

  let dist_query = `SELECT DISTINCT district,state_name,latitude,longitude FROM aqai.logistics WHERE pincode =${user_details.pincode}`;
  let data = await client
    .query(dist_query)
    .catch((error) => console.log(error));
  let area = data.rows[0];
  let address_obj = {
    address: {
      id: 1,
      name: user_details.name,
      phone: user_details.phone,
      address: user_details.address.deliveryAddress,
      billing_address : user_details.address.billingAddress,
      gst_no: null,
      pincode: user_details.pincode,
      village: null,
      district_id: area.district,
      state_id: area.state_name,
      latitude: area.latitude,
      longitude: area.longitude,
      land_mark: user_details.landmark,
      delivery_instructions: null,
      address_type: null,
      farm: null,
      farm_no: null,
      default_address: 1,
    },
  };
  let address_data = `[${JSON.stringify(address_obj.address)}]`;
  let query = `INSERT INTO aqai.customers (name,phone,email,lang_id,address,pincode) VALUES 
  ('${user_details["name"]}','${user_details["phone"]}','${user_details["email"]}',
  '${user_details["lang_id"]}','${address_data}','${user_details["pincode"]}') returning *`;
  let result = await client.query(query);
  result.rows.length &&
    res.status(200).send({
      status: true,
      msg: "Customer successfully created",
      data: { user: result.rows[0] },
    });
  !result.rows.length &&
    res.status(500).send({ status: false, msg: "Something went wrong" });
};

exports.get_customer = async (req, res) => {
  let { phone } = req.query;
  const client = new Client(credentials);
  client.connect();
  
  let countQuery = `Select COUNT(id) from aqai.customers WHERE "phone" = ${phone}`;
  let countResult = await client.query(countQuery)

  let page = parseInt(req.query.page) || 1;
  let page_size = parseInt(req.query.limit) || 15; 
  let total_customers = parseInt(countResult.rows[0].count)
  let pages = Math.ceil(total_customers / page_size) || 1;
    if (page > pages) page = pages;
    let skip = (page - 1) * page_size;

  let findUserQuery = `SELECT * FROM aqai.customers WHERE "phone" = ${phone}`
  let result = await client
    .query(findUserQuery)
    .catch((err) =>
      res
        .status(500)
        .send({ status: false, msg: "Something went wrong", data: err })
    );
  if(result.rows[0]){
    client.end()
    res
      .status(200)
      .send({ status: true, msg: "Customer Data",count: result.rows.length,
      total_customers,
      page,
      pages, data: result.rows[0] });
  }
  if(!result.rows.length){
    client.end()
    res.status(500).send({ status: false, msg: "Something went wrong" });
  }
};


exports.get_all_customers = async (req, res) => {
  const {filter_value,filter_field} = req.query
  
  try {
    const client = new Client(credentials);
    client.connect();
    let total_rows = 
      `SELECT COUNT(id) FROM aqai.customers `

    if(filter_field){
      total_rows += `WHERE ${filter_field}::text ILike '%${filter_value}%' `
    }
    let countQuery = await client.query(total_rows)
    
        let page = parseInt(req.query.page) || 1;
        let page_size = parseInt(req.query.limit) || 15;
        let total_customers = parseInt(countQuery.rows[0].count);
        let pages = Math.ceil(total_customers / page_size) || 1;
  
        if (page > pages) page = pages;
        let skip = (page - 1) * page_size;

    let query = `SELECT *,(SELECT DISTINCT district FROM aqai.logistics l WHERE l.pincode = CAST(pincode AS INTEGER) LIMIT 1) AS district FROM aqai.customers `;
    if(filter_value) {
      query += `WHERE "${filter_field}"::text ILike '%${filter_value}%' ORDER BY id DESC OFFSET ${skip} LIMIT ${page_size}` 
    }else {
      query += `ORDER BY id DESC OFFSET ${skip} LIMIT ${page_size}`
    }
    const result = await client.query(query).catch(err => console.log(err))
    client.end()
    res.status(200).json({
      status: "success",
      count: result.rows.length,
      total_customers,
      page,
      pages,
      data: result.rows,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Server Error",
    });
  }
};

exports.update_customer = async (req, res) => {};
