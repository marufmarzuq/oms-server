//Packages to connect postgresql DB
const pkg = require("pg");
const { Client } = pkg;
const dotenv = require("dotenv"); //package to use dotenv
const bcrypt = require("bcrypt");

dotenv.config();
credentials = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};

exports.get_all_products = async (req, res) => {
  let { order_type } = req.query;
  const client = new Client(credentials);
  client.connect();
  let query = `SELECT id,CONCAT(base_url,product_image) image,zoho_item_id,name_en,category,discounted_price,price,minimum_quantity,multiple_of,product_unit,product_type FROM aqai.products WHERE direct_ordering_enabled=1`;
  let result = await client.query(query).catch(err => console.log(err))
  client.end()
  result.rows.length
    ? res.status(201).send({
        status: true,
        msg: "Product data",
        data: result.rows,
      })
    : res.status(500).send({ status: false, msg: "Something went wrong" });
};

// exports.change_order_status = async (req, res) => {
//   let {
//     phone,
//     order_id,
//     order_item_id,
//     from_status,
//     to_status,
//     reason,
//     sales_person,
//     net_amount,
//   } = req.body;

//   const client = new Client(credentials);
//   client.connect();

//   const date = moment().format("YYYY/MM/DD");
//   let status_object = {
//     from_status: from_status,
//     to_status: to_status,
//     changed_by: sales_person,
//     changed_date: date,
//   };
//   status_object = JSON.stringify(status_object);

//   reason = reason ? `'${reason}'` : `${null}`;
//   let query = `with order_update AS (UPDATE aqai.orders SET order_status= '${to_status}' , net_amount = '${net_amount}' WHERE "id"=${order_id} returning id)
//      UPDATE aqai.order_items SET item_status = '${to_status}',reason= ${reason},status_log = '${status_object}'
//      WHERE "order_id"='${order_id}' returning *`;

//   let result = await client.query(query);

//   ///////////////////////// SMS for status change in OMS - Start ////////////////////////////////
//   if (
//     to_status == "processing" ||
//     to_status == "dispatched" ||
//     to_status == "delivered" ||
//     to_status == "cancelled"
//   ) {
//     let msgBody;
//     // let currentDate = moment().format("DD/MM/YYYY");
//     let tollFree = "04446314390";

//     if (to_status == "processing") {
//       msgBody = `Your order with Order ID ${order_id} is being processed. We will update once it is dispatched`;
//     }
//     if (to_status == "dispatched") {
//       msgBody = `Your order with Order ID ${order_id} has been dispatched. You can call our support executive for assistance.`;
//     }
//     if (to_status == "delivered") {
//       let link =
//         "https://forms.zohopublic.in/aqgromalinfarmtechservicespr/form/FeedbackChat/formperma/rFua23QQasPT9QdwUR3t4MqTwsBzlMvsHGZ1yY58_3U";
//       msgBody = `Dear Customer, Your Order ID ${order_id} has been delivered. Please acknowledge your delivery feedback on ${link}. Keep shopping with us!`;
//     }
//     if (to_status == "cancelled") {
//       msgBody = `Your order ID ${order_id} has been cancelled. Please log on to AQAI app for more information or call to our toll free number - ${tollFree} `;
//     }

//     let data = JSON.stringify({
//       to_number: phone,
//       msg_data: msgBody,
//     });

//     let smsConfig = {
//       method: "post",
//       url: "https://message-node-adk24f4fea-uc.a.run.app/api/v1/sms",
//       headers: {
//         Authorization: "Basic YXFhaUFQSTphcWFpQGduaWdhc3NlbQ==",
//         "Content-Type": "application/json",
//       },
//       data: data,
//     };
//     axios(smsConfig)
//       .then(function (resp) {
//         // console.log(resp);
//       })
//       .catch(function (error) {
//         console.log(error);
//       });
//   }
//   ///////////////////////// SMS for status change in OMS - End ////////////////////////////////

//   !result &&
//     res.status(500).send({ success: false, message: "Something went wrong" });
//   if (result.rows) {
//     let updated_order_id = result.rows[0];
//     res.status(201).send({
//       success: true,
//       message: `Your order with order id : # ${order_id} is cancelled successfully`,
//     });
//   }
// };
