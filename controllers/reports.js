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


// report api for sales orders and invoices ///////////////////////////////////////////////////////////////////////////////////
exports.getSalesOrderReport = async (req, res) => {
  let {filters,sort,currPage, limit,start_date,end_date } = req.query;
  let client = new Client(credentials);
  client.connect();
  sort = JSON.parse(sort)
  let sort_key = sort ? `ORDER BY ${sort["field"]} ${sort["value"]}` : "ORDER BY id DESC"
  let limits = `LIMIT ${limit}`;
  let filter_key = `ordered_date >= '${start_date}' AND ordered_date <= '${end_date}'`;
  let offset = `OFFSET ${(currPage - 1) * limit}`;
  // filters ,pagination, limit and offset logic block ////////////////////////
 
  // Pagination block ends here ////////////////////////////////////////////////////////////
  if(filters){
    filters = JSON.parse(filters);
for (let i = 0; i < filters.length; i++) {
      filter_key = filter_key + ` AND ${filters[i]["field"]} = ${filters[i]["value"]}`
}


  let sales_order_report_query = `SELECT id,sales_order_no,net_amount,ordered_date,invoice_no,final_order_amount,
 FROM aqai.orders WHERE ${filter_key} GROUP BY id ${sort_key} ${offset} ${limits}`

  console.log(sales_order_report_query)
  let sales_order_report_result = await client.query(sales_order_report_query).catch(err => console.log(err))
  so_data = sales_order_report_result.rows
}
client.end()
  res.status(200).send(so_data)
};

exports.getSalesWidget = async (req, res) => {
  let client = new Client(credentials);
  client.connect();
 

  let sales_order_report_query = `SELECT SUM(CAST(online_paid_amount AS decimal) + CAST(cash_paid_amount AS DECIMAL)) AS paid_amount,
   (SELECT SUM (net_amount)) as net_amount, (SELECT SUM (final_order_amount)) as final_order_amount, (select count(invoice_no)) as invoice_no,
   (select count (sales_order_no)) as sales_order_no, (SELECT COUNT(id))  AS total_entries FROM aqai.orders`
  console.log(sales_order_report_query)
  let sales_order_report_result = await client.query(sales_order_report_query).catch(err => console.log(err))
  console.log("sales order report result is", sales_order_report_result)
  so_data = sales_order_report_result.rows[0]
  let invoice_and_sales_query = `select (select count (invoice_no) from aqai.orders where invoice_no is not null ) as invoice_no , (select count (sales_order_no)  from aqai.orders where sales_order_no is not null )  as sales_order_no from aqai.orders limit 1`
  let invoice_and_sales_result = await client.query(invoice_and_sales_query).catch(err => console.log(err))
  console.log("sales order report result is", invoice_and_sales_result)
  let invoice_no = invoice_and_sales_result.rows[0].invoice_no
  let sales_no = invoice_and_sales_result.rows[0].sales_order_no
  let data = {}

  data["total_orders"] = Number (so_data.total_entries)
  data["total_sales_orders"] = Number (sales_no)
  data["total_sales_order_revenue"] =  Number (sales_order_report_result.rows[0].net_amount)
  data["total_invoice_revenue"] = Number (sales_order_report_result.rows[0].final_order_amount)
  data["total_invoices"] = Number (invoice_no)
  data["pending_invoices"] = data["total_orders"] - data["total_invoices"]
  data["pending_revenue"] = data["total_sales_order_revenue"] - data["total_invoice_revenue"]
  // data["total_entries"] = so_data.total_entries

  let result = []
  result.push(data)
  client.end()
  res.send({msg : result})


}


// SO REPORT ENDS HERE ////////////////////////////////////////////////////////////////////////////////////////////////////////////

// STATUS LOG REPORT API STARTS HERE //////////////////////////////////////////////////////////////////////////////////////////////

exports.getStatusLogReports = async (req, res) => {
  let {filters,sort,currPage, limit,start_date,end_date } = req.query;
  let client = new Client(credentials);
  client.connect();
  

  // filters ,pagination, limit and offset logic block ////////////////////////
  sort = sort ? JSON.parse(sort) : null
  let sort_key = sort ? `ORDER BY ${sort["field"]} ${sort["value"]}` : "ORDER BY id DESC"
  let limits = `LIMIT ${limit}`;
  let filter_key = `ordered_date >= '${start_date}' AND ordered_date <= '${end_date}'`;
  let offset = `OFFSET ${(currPage - 1) * limit}`;

  if(filters){
  filters = JSON.parse(filters);
  for (let i=0;i<filters.length;i++) {
    filter_key = filter_key + ` AND ${filters[i]["field"]} = ${filters[i]["value"]}`
  }
}
  // Pagination block ends here ////////////////////////////////////////////////////////////


  let status_log_query = `SELECT id,order_id,status_log ,
  (SELECT COUNT(id) FROM aqai.order_items WHERE ${filter_key}) AS total_entries
  FROM aqai.order_items WHERE ${filter_key} GROUP BY id ${sort_key} ${offset} ${limits}`
  let status_log_query_result = await client.query(status_log_query).catch(err => console.log(err))
  let table_data = []
  let status_count = {}
  let status_log_data = status_log_query_result.rows
  let total_entries = status_log_data[0].total_entries
  let total_pages = Math.ceil(total_entries/limit)
  status_log_data.forEach(element => {
     element["status_log"].forEach(status => {
       status["order_id"] = element["order_id"]
       status["id"] = element["id"]
       table_data = [...table_data,status]
       if(status_count[status.to_status]) status_count[status.to_status]++
       else if(!status_count[status.to_status]) status_count[status.to_status] = 1
     })

  });

  let data = {total_entries,total_pages,status_count,table_data}
  res.send(data)
}


exports.getProductReports = async(req,res) => {
  let {filters, page_size, page_number, sort_params , start_date,end_date } = req.query;
  let client = new Client(credentials);
  client.connect();
  

  let product_report_query = `SELECT (SELECT name_en FROM aqai products p WHERE p.id = product_id),line_total,(SELECT sales_order_no FROM aqai.orders o WHERE o.id = order_id),(SELECT invoice_no FROM aqai.orders o WHERE o.id = order_id) FROM aqai.order_items WHERE ordered_date >= '${start_date}' AND ordered_date <= '${end_date}' AND item_status != 'cancelled' ORDER BY id DESC`
  console.log(product_report_query)
  let product_report_result = await client.query(product_report_query).catch(err => console.log(err))
  product_report_data = product_report_result.rows

  res.send(product_report_data)
}