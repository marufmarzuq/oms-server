//Packages to connect postgresql DB
const pkg = require("pg");
const { Client } = pkg;
const dotenv = require("dotenv"); //package to use dotenv
const bcrypt = require("bcrypt");
const moment = require("moment");
const jwt = require("jsonwebtoken");
// Set up Global configuration access
dotenv.config();
credentials = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};

exports.get_overall_kpi = async (req, res) => {
  const { start_date, end_date } = req.query;
  let query = `Select COUNT(id), SUM(CAST(net_amount AS DECIMAL)) AS total_revenue,order_status From aqai.orders WHERE 
  ordered_date >= '${start_date}' AND ordered_date <= '${end_date}' AND order_status != 'cancelled' GROUP BY order_status`;
  let client = new Client(credentials);
  client.connect();
  let result = await client.query(query).catch((err) => console.log(err));
  let data = [...result.rows];
  let obj_ref = {};
  data.forEach((ele) => {
    obj_ref[ele["order_status"]] = ele["count"];
    obj_ref["total_revenue"] = obj_ref["total_revenue"]
      ? +obj_ref["total_revenue"] + +ele["total_revenue"]
      : +ele["total_revenue"];
    obj_ref["total_orders"] = obj_ref["total_orders"]
      ? +obj_ref["total_orders"] + +ele["count"]
      : +ele["count"];
  });
  // let product_query = `SELECT COUNT(oi.order_id),SUM(oi.line_total)
  // AS revenue,ap.name_en AS product_name, concat(ap.base_url,ap.product_image)
  // image FROM aqai.order_items oi LEFT JOIN aqai.products ap ON (oi.product_id = ap.id)
  //  WHERE oi.created_at >= '${start_date}' AND oi.created_at <= '${end_date}' AND oi.item_status != 'cancelled'
  //  GROUP BY oi.product_id,ap.name_en,ap.base_url,ap.product_image`;

  let product_query = `SELECT SUM(CAST(oi.quantity AS DECIMAL)) AS total_quantity,ap.product_unit,SUM(CAST(oi.line_total AS DECIMAL)) AS revenue, 
   ap.name_en AS product_name,CONCAT(ap.base_url,ap.product_image) image 
   FROM aqai.order_items oi LEFT JOIN aqai.products ap ON oi.product_id = ap.id WHERE oi.ordered_date >= '${start_date}'
    AND oi.ordered_date <= '${end_date}' AND oi.item_status != 'cancelled' GROUP BY ap.id,ap.product_unit,ap.name_en,ap.base_url,ap.product_image`;

  let response = await client
    .query(product_query)
    .catch((err) => console.log(err));
  let prod_data = response.rows;
  client.end()
  res.status(200).send({
    status: true,
    msg: "KPI of the day",
    data: { overall_data: obj_ref, product_data: prod_data },
  });
};

exports.get_order_type_kpi = async (req, res) => {
  const { start_date, end_date, order_type } = req.query;
  let query = `Select COUNT(id), SUM(CAST(net_amount AS DECIMAL)) AS total_revenue,order_status From aqai.orders WHERE 
  ordered_date >= '${start_date}' AND ordered_date <= '${end_date}' AND order_type = '${order_type}' AND order_status != 'cancelled' GROUP BY order_status`;
  let client = new Client(credentials);
  client.connect();
  let result = await client.query(query).catch((err) => console.log(err));
  let data = result.rows;
  let obj_ref = {};
  data.forEach((ele) => {
    obj_ref[ele["order_status"]] = ele["count"];
    obj_ref["total_revenue"] = obj_ref["total_revenue"]
      ? +obj_ref["total_revenue"] + +ele["total_revenue"]
      : +ele["total_revenue"];
    obj_ref["total_orders"] = obj_ref["total_orders"]
      ? +obj_ref["total_orders"] + +ele["count"]
      : +ele["count"];
  });
  
  let product_query = `SELECT SUM(CAST(oi.quantity AS DECIMAL)) AS total_quantity,ap.product_unit,SUM(CAST(oi.line_total AS DECIMAL)) AS revenue, ap.name_en AS product_name,CONCAT(ap.base_url,ap.product_image) image FROM aqai.order_items oi LEFT JOIN aqai.products ap ON oi.product_id = ap.id WHERE oi.ordered_date >= '${start_date}' AND oi.ordered_date <= '${end_date}' AND oi.item_status != 'cancelled' AND ap.product_type = '${order_type}' GROUP BY ap.id `;

  let response = await client
    .query(product_query)
    .catch((err) => console.log(err));
  let prod_data = response.rows;
  client.end()
  res.status(200).send({
    status: true,
    msg: "KPI of the day",
    data: { overall_data: obj_ref, product_data: prod_data },
  });
};
