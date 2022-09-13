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

exports.get_all_feedbacks = async (req, res) => {
  let { filters, pageSize, currPage, sortField, sortOrder } = req.body;
  console.log(filters, pageSize, currPage, sortField, sortOrder);
  const client = new Client(credentials);
  client.connect();

  let countQuery = `SELECT COUNT(id) FROM aqai.order_items `;
  let total_rows = await client.query(countQuery);
  let total_orders = parseInt(total_rows.rows[0].count);
  let pages = Math.ceil(total_orders / pageSize) || 1;
  let sort_key = "";
  let limit = `LIMIT ${pageSize}`;
  let filter_key = [];
  let offset = `OFFSET ${(currPage - 1) * pageSize}`;
  // filters = JSON.parse(filters);
  // sort_params = JSON.parse(sort_params)

  for (key in filters) {
    filter_key.push(`${key} = '${filters[key]}'`);
  }

  filter_key = filter_key.join(" AND ");
  filter_key = "WHERE " + filter_key;
 
  sort_key = `ORDER BY ${sortField} ${sortOrder}`;
  let query;
  if(Object.keys(filters).length == 0){
     query = `SELECT order_id,(SELECT name_en FROM aqai.products p WHERE p.id=product_id) AS product_name,item_status,(SELECT o.customer_name FROM aqai.orders o WHERE o.id=order_id) AS customer_name,(SELECT o.customer_mobile FROM aqai.orders o WHERE o.id=order_id) AS customer_mobile,feedback,rating,reason,feedback_skipped,quantity FROM aqai.order_items ${sort_key} ${limit} ${offset}`;

  }else {
    countQuery += `${filter_key}`
     total_rows = await client.query(countQuery);
   total_orders = parseInt(total_rows.rows[0].count);
   pages = Math.ceil(total_orders / pageSize) || 1;
   query = `SELECT order_id,(SELECT name_en FROM aqai.products p WHERE p.id=product_id) AS product_name,item_status,(SELECT o.customer_name FROM aqai.orders o WHERE o.id=order_id) AS customer_name,(SELECT o.customer_mobile FROM aqai.orders o WHERE o.id=order_id) AS customer_mobile,feedback,rating,reason,feedback_skipped,quantity FROM aqai.order_items ${filter_key} ${sort_key} ${limit} ${offset}`;
  }
  let result = await client.query(query);
  // .catch((err) => console.log(err));
  client.end()
  res.status(200).json({data:result.rows,pages,count:result.rows.length,total_orders});
};
