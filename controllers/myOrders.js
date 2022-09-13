const pkg = require("pg");
const { Client } = pkg;
const dotenv = require("dotenv"); //package to use dotenv
const bcrypt = require("bcrypt");
const moment = require("moment");
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

exports.get_admin_detail = async (req, res) => {
  const client = new Client(credentials);
  client.connect();
  let query = `SELECT DISTINCT name,email,zoho_id,approver from aqai.admins WHERE zoho_id IS NOT NULL ORDER BY name ASC`;
  const result = await client.query(query);
  let approvers =  [...result.rows]
  // console.log(approvers)//
  approvers = approvers.filter(ele => ele.approver == 1)
  console.log(approvers)
  !result.rows.length &&
    res.status(500).send({ success: false, message: "Something went wrong" });
  if (result.rows) {
    res.status(200).send({
      success: true,
      data: result.rows,
      approvers : approvers
    });
  }
};

exports.update_order_admin = async (req, res) => {
  const { order_id, email } = req.query;
  const client = new Client(credentials);
  client.connect();
  let query = `UPDATE aqai.orders SET customer_executive_id = '${email}' WHERE "id" = ${order_id} returning id`;
  const result = await client.query(query).catch((err) => {
    console.log("error", err);
  });
  if (result) {
    !result.rows.length &&
      res
        .status(500)
        .send({ success: false, message: "No orders found with this id" });
    if (result.rows) {
      res.status(200).send({
        success: true,
        message: "successfull",
      });
    }
  }
};

exports.get_my_orders = async (req, res) => {
  try {
    const client = new Client(credentials);
    client.connect();

    let { filter_filed, filter_value, sort_field, sort_order, person } =
      req.query;
    if (filter_value === "App" || filter_value === "app") {
      filter_value = "android";
    }

    let countQuery = `SELECT COUNT(id) FROM aqai.orders WHERE customer_executive_id = '${person}' `;
    // checking order type
    if (filter_value === "App" || filter_value === "app") {
      filter_value = "android";
    }

    // cheking feltering
    if (filter_value) {
      countQuery += `AND "${filter_filed}"::text ILike '%${filter_value}%' `;
    }

    let total_rows = await client.query(countQuery);

    let page = parseInt(req.query.page) || 1;
    let page_size = parseInt(req.query.limit) || 15;
    let total_orders = parseInt(total_rows.rows[0].count);
    let pages = Math.ceil(total_orders / page_size) || 1;

    if (page > pages) page = pages;
    let skip = (page - 1) * page_size;

    let query = `SELECT * from aqai.orders WHERE customer_executive_id = '${person}' `;
    // cheking feltering
    if (filter_value) {
      query += `AND "${filter_filed}"::text ILike '%${filter_value}%' `;
    }

    // Cheking sorting
    if (sort_field) query += ` ORDER BY ${sort_field} ${sort_order} `;
    // adding limit and page size
    query += `OFFSET ${skip} LIMIT ${page_size}`;
    const result = await client.query(query);
    client.end()
    res.status(200).json({
      status: "success",
      count: result.rows.length,
      total_orders,
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

exports.get_status_history = async (req, res) => {
  const { order_item_id } = req.query;
  const client = new Client(credentials);
  client.connect();
  let query = `SELECT status_log from aqai.order_items where id = ${order_item_id} `;
  const result = await client.query(query).catch((err) => {
    console.log(err);
  });
  if (result) {
    !result.rows.length &&
      res.status(200).send({ success: false, msg: "Something went wrong" });
    if (result.rows) {
      client.end()
      res.status(200).send({
        success: true,
        data: result.rows[0].status_log,
      });
    }
  }
};

exports.get_state = async (req, res) => {
  try {
    const client = new Client(credentials);
    client.connect();
    let state_query = `SELECT DISTINCT state_name FROM aqai.logistics ORDER BY state_name`;
    client.query(state_query, (err, resp) => {
      if (err) {
        client.end()
        res.status(500).send("Sorry something went wrong");
      } else if (resp) {
        client.end()
        res.status(200).send(resp.rows);
      }
    });
  } catch (err) {
    res.status(500).send("INTERNAL SERVER ERROR");
  }
};

exports.change_details = async (req,res) => {
  let {delivery_address,order_id,landmark} = req.body
  console.log(req.body)
  try {
    const client = new Client(credentials);
    client.connect();
    let query = `UPDATE aqai.orders SET landmark = '${landmark}', delivery_address = '${delivery_address}' where id = ${order_id} returning id`
    const result = await client.query(query)
    if(result.rows){
      res.status(200).send({status:true,message:"Successfully updated"})
    }else if(!result.rows.length){
      res.status(500).send("Sorry something went wrong");
    }
  }catch (err) {
    res.status(500).send("INTERNAL SERVER ERROR");
  }
}
