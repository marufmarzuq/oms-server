//Packages to connect postgresql DB
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

exports.place_order = async (req, res) => {
  console.log(req.body)
  let {
    customer_id,
    order_type,
    latitude,
    longitude,
    total_amount,
    net_amount,
    pay,
    online_paid_amount,
    expected_delivery_date,
    partial_paid_amount,
    customer_name,
    customer_mobile,
    delivery_address,
    landmark,
    delivery_address_id,
    delivery_pincode,
    items,
    sales_person,
    offer_amount,
    time,
    sales_details,
  } = req.body;

  const client = new Client(credentials);
  client.connect();

  function addslashes(str) {
    return (str + "").replace(/[\\"']/g, "\\$&").replace(/\u0000/g, "\\0");
  }

  function addLankmark(str) {
    return (str + "").replace(/[\\"']/g, "\\$&").replace(/\u0000/g, "\\0");
  }

  delivery_address = addslashes(delivery_address);
  landmark = addLankmark(landmark)

  // let state_name = `INSERT INTO delivery_state from aqai.orders o = (SELECT DISTINCT l.pincode = ${delivery_pincode})`

  let order_params = `("customer_id","order_type","latitude","longitude","total_amount","net_amount",
  "order_status","device_type","payment_mode","online_paid_amount","partial_paid_amount","customer_name","customer_mobile",
  "delivery_address","landmark","delivery_pincode","items_count","expected_delivery_date","delivery_address_id","offer_amount",
  "customer_executive_id","delivery_state")`;

  let order_values = `('${customer_id}', '${order_type}','${latitude}','${longitude}',${total_amount},${net_amount},
    'pending','OMS','${pay}','${online_paid_amount}','${partial_paid_amount}','${customer_name}','${customer_mobile}',
    (E'${delivery_address}'),(E'${landmark}'),'${delivery_pincode}','${items.length}','${expected_delivery_date}',
    '${delivery_address_id}','${offer_amount}','${sales_person}',(SELECT DISTINCT l.state_name FROM aqai.logistics l WHERE l.pincode = ${delivery_pincode}))`;

  let add_order_query = `INSERT INTO aqai.orders ${order_params} VALUES ${order_values} RETURNING id`;
  let result = await client.query(add_order_query).catch((err) => {
    console.log(err);
    res
      .status(500)
      .send({ success: false, message: "Something went wrong", data: err });
  });

  let order_id = result.rows[0].id;
  let order_items_params = `("order_id","product_id","product_name","unit","product_price",
  "discounted_price","discount_reason","quantity","item_status","line_total","status_log")`;
  let order_items_values = [];
  const date = moment().format("DD/MM/YYYY");
  // const time = moment().utc().local().format("DD-MM-YYYY, HH:mm:ss");
  let so_items = [];
  items.forEach(async (item) => {
    let line_price = item.discounted_price;
    // item.discounted_price < item.price && item.discounted_price > 0
    //   ? item.discounted_price
    //   : item.price;
    let total = line_price * item.quantity;
    let status_json = JSON.stringify([
      {
        from_status: "NA",
        to_status: "pending",
        changed_by: sales_person,
        changed_date: date,
        changed_time: time,
      },
    ]);
    let statement = `('${order_id}','${item.product}','${item.product_name}','${item.product_unit}','${item.price}',
      '${item.discounted_price}','${item.discount_reason}',${item.quantity},'pending','${total}','${status_json}')`;

    order_items_values.push(statement);

    let p_query = `SELECT zoho_item_id FROM aqai.products WHERE id = ${item.product}`;
    let get_zoho_id = await client
      .query(p_query)
      .catch((err) => console.log(err));

    let item_data = {
      zoho_item_id: item.zoho_item_id,
      name : item.category != "No category" ? (`${item.product_name}(${item.category})`) : (`${item.product_name}`),
      line_price: line_price,
      quantity: item.quantity,
      description: item.description,
      warehouse_id: item.warehouse_id,
      // tax_type : item.tax_type
    };
    // console.log("line no.106", item_data);
    so_items.push(item_data);
  });
  // console.log("line no.109", so_items);
  order_items_values = order_items_values.join(",");
  let product_item_query = `INSERT INTO aqai.order_items ${order_items_params} VALUES ${order_items_values} returning id`;

  let final_result = await client.query(product_item_query);
  if (final_result.rows[0].id) {
    //////// Push notifications////////////////////
    let get_customer_query = `SELECT device_token, device_type FROM aqai.customers WHERE phone = ${customer_mobile}`;
    let get_customer = await client.query(get_customer_query);
    let device = [...get_customer.rows];
    let url_noti;
    if (device[0].device_type == "android") {
      url_noti =
        "https://notification-node-dev-loq5g64vpq-uc.a.run.app/api/v1/android-notification";
    } else if (device[0].device_type == "ios") {
      url_noti =
        "https://notification-node-dev-loq5g64vpq-uc.a.run.app/api/v1/ios-notification";
    }

    if (get_customer.rows.length > 0) {
      device_token = get_customer.rows[0].device_token;

      let n_data = JSON.stringify({
        device_token: device_token,
        title: "Order Placed",
        body: `Your Order #${order_id} has been placed. We will contact you and update the order in 1-2 working days.`,
        click_action: {
          tag: "order_status_change",
          action: 1,
          order_id: order_id,
        },
      });

      let config = {
        method: "post",
        url: url_noti,
        headers: {
          "Content-Type": "application/json",
        },
        data: n_data,
      };

      axios(config)
        .then(function (response) {
          console.log(JSON.stringify(response.data));
        })
        .catch(function (error) {
          console.log(error);
        });
    }
    /////////////////////////////////////////////////////// Start - Create SO //////////////////////////////////////////////////////////////

    let so_data = {
      user: {
        phone: customer_mobile,
        name: customer_name,
        address: delivery_address,
        pincode: delivery_pincode,
      },
      order: {
        order_id: order_id,
        items: so_items,
      },
      sales_details,
    };
    console.log(so_data)
    let config = {
      method: "post",
      url: "https://zoho-node-prod-76phe6ssxq-uc.a.run.app/api/v1/create-so",
      headers: {
        "Content-Type": "application/json",
      },
      data: so_data,
    };

    axios(config)
      .then((response) => {
        console.log(response);
      })
      .catch((err) => {
        console.log(err);
      });

    /////////////////////////////////////////////////////// End - Create SO ////////////////////////////////////////////////////////////////
  }

  ////////////////////////// SMS - start ///////////////////////////////////////////////////
  let msgBody;
  let currentDate = moment().format("DD/MM/YYYY");
  if (pay == "COD") {
    msgBody = `Your COD order with us has been submitted. Please note your order ID-${order_id} on ${currentDate} for your reference. Please pay Rs.${net_amount} for the order at the time of Delivery You will get the updates on order despatch within 1-2 days.`;
  } else if (pay == "ONLINE") {
    msgBody = `Your order with us has been submitted sucessfully through online payment. Please note your order ID -${order_id} on ${currentDate} for your reference. You will get the updates on order despatch within 1-2 days.`;
  }

  let data = JSON.stringify({
    to_number: customer_mobile,
    msg_data: msgBody,
  });

  let smsConfig = {
    method: "post",
    url: "https://message-node-adk24f4fea-uc.a.run.app/api/v1/sms",
    headers: {
      Authorization: "Basic YXFhaUFQSTphcWFpQGduaWdhc3NlbQ==",
      "Content-Type": "application/json",
    },
    data: data,
  };
  axios(smsConfig)
    .then(function (resp) {
      // console.log(resp);
    })
    .catch(function (error) {
      console.log(error);
    });
  ////////////////////////// SMS - End ///////////////////////////////////////////////////
  ////////////////////////// Whatsapp - Start ////////////////////////////////////////////
  let trait;
  if (pay == "COD") {
    trait = {
      Mar_cod_id: order_id,
      Mar_cod_date: currentDate,
      Mar_cod_payment: net_amount,
    };
  } else if (pay == "ONLINE") {
    trait = {
      Mar_advance_id: order_id,
      Mar_advance_date: currentDate,
    };
  }

  let inputData = JSON.stringify({
    phone: customer_mobile,
    traitData: trait,
  });

  let whatsappConfig = {
    method: "post",
    url: "https://message-node-adk24f4fea-uc.a.run.app/api/v1/whatsapp",
    headers: {
      Authorization: "Basic YXFhaUFQSTphcWFpQGduaWdhc3NlbQ==",
      "Content-Type": "application/json",
    },
    data: inputData,
  };
  axios(whatsappConfig).catch(function (error) {
    console.log(error);
  });
  ////////////////////////// Whatsapp - Start ////////////////////////////////////////////
  client.end();
  res.status(200).send({
    success: true,
    message: "Order Placed successfully",
    data: { order_id: order_id },
  });
};

exports.get_all_orders = async (req, res) => {
  try {
    const client = new Client(credentials);
    client.connect();
    let { order_type, filter_filed, filter_value, sort_field, sort_order } =
      req.query;

    if (filter_value === "App" || filter_value === "app") {
      filter_value = "android";
    }

    let countQuery = `SELECT COUNT(id) FROM aqai.orders `;
    // checking order type
    if (order_type !== "all-orders") {
      countQuery += `WHERE "order_type"='${order_type}' `;
    }
    // cheking feltering
    if (filter_value && order_type === "all-orders") {
      countQuery += `WHERE "${filter_filed}"::text ILike '%${filter_value}%' `;
    }
    if (filter_value && order_type !== "all-orders") {
      countQuery += `AND "${filter_filed}"::text ILike '%${filter_value}%' `;
    }

    let total_rows = await client.query(countQuery);

    let page = parseInt(req.query.page) || 1;
    let page_size = parseInt(req.query.limit) || 15;
    let total_orders = parseInt(total_rows.rows[0].count);
    let pages = Math.ceil(total_orders / page_size) || 1;

    if (page > pages) page = pages;
    let skip = (page - 1) * page_size;

    let query = `SELECT * from aqai.orders `;
    // `SELECT *,(SELECT l.state_name FROM aqai.logistics l WHERE l.pincode = o.delivery_pincode LIMIT 1)
    //  AS state FROM aqai.orders o `;

    // checking order type
    if (order_type !== "all-orders") {
      query += ` WHERE "order_type"='${order_type}' `;
    }
    // cheking filtering
    if (filter_value && order_type === "all-orders") {
      query += `WHERE "${filter_filed}"::text ILike '%${filter_value}%' `;
    }
    if (filter_value && order_type !== "all-orders") {
      query += `AND "${filter_filed}"::text ILike '%${filter_value}%' `;
    }
    // Cheking sorting
    if (sort_field) query += ` ORDER BY ${sort_field} ${sort_order} `;
    // adding limit and page size
    query += `OFFSET ${skip} LIMIT ${page_size}`;
    const result = await client.query(query);
    client.end();
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

exports.get_open_orders = async (req, res) => {
  try {
    const client = new Client(credentials);
    client.connect();
    let { filter_filed, filter_value, sort_field, sort_order } = req.query;
    let countQuery = `SELECT COUNT(id) FROM aqai.orders WHERE "order_status" IN('pending','processing') `;

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

    let query = `SELECT * from aqai.orders WHERE "order_status" IN('pending','processing') `;

    // cheking feltering
    if (filter_value) {
      query += `AND "${filter_filed}"::text ILike '%${filter_value}%' `;
    }

    // Cheking sorting
    if (sort_field) query += ` ORDER BY ${sort_field} ${sort_order} `;
    // adding limit and page size
    query += `OFFSET ${skip} LIMIT ${page_size}`;
    const result = await client.query(query);
    client.end();
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

exports.get_order_details = async (req, res) => {
  const { order_id } = req.query;
  const client = new Client(credentials);
  client.connect();
  const query = `SELECT oi.*,ap.product_image,oo.partial_paid_amount,oo.online_paid_amount,oo.refund_id,
  oo.payment_mode,oo.ordered_date,oo.expected_delivery_date,oo.delivered_date,oo.net_amount,
  oo.total_amount,oo.final_order_amount,oo.order_status,oo.offer_amount,
  oi.status_log AS item_status_history FROM aqai.order_items oi
   INNER JOIN aqai.orders oo ON (oo.id = oi.order_id) INNER JOIN aqai.products ap ON(oi.product_id = ap.id)  
   WHERE oi.order_id=${order_id} ORDER BY oi.id ASC`;
  const result = await client.query(query);
  let data = [...result.rows];
  let final_data = {};
  data.forEach((ele) => {
    let status_array = ["pending", "processing", "dispatched", "delivered"];
    final_data["order_id"] = ele["order_id"];
    final_data["partial_paid_amount"] = ele["partial_paid_amount"];
    final_data["online_paid_amount"] = ele["online_paid_amount"];
    final_data["payment_mode"] = ele["payment_mode"];
    final_data["ordered_date"] = moment(ele["ordered_date"]).format("DD/MM/YY");
    final_data["refund_id"] = ele["refund_id"];
    final_data["net_amount"] = ele["net_amount"];
    final_data["total_amount"] = ele["total_amount"];
    final_data["offer_amount"] = ele["offer_amount"];
    final_data["final_order_amount"] = ele["final_order_amount"];
    // ele.item_status_history.map((entry) => {
    //   ele["item_status"] == entry["to_status"]
    //     ? (entry["status"] = "active")
    //     : (entry["status"] = "completed");
    //   status_array.indexOf(entry["to_status"]) > -1 &&
    //     status_array.splice(status_array.indexOf(entry["to_status"]), 1);
    // });

    // if (ele["item_status"] != "cancelled") {
    //   status_array.forEach((elem) =>
    //     ele.item_status_history.push({
    //       to_status: elem,
    //       created_at: null,
    //       status: "inactive",
    //     })
    //   );
    // }
    delete ele["order_item_id"];
    delete ele["status_log"];
    delete ele["order_id"];
    delete ele["partial_paid_amount"];
    delete ele["online_paid_amount"];
    delete ele["payment_mode"];
    delete ele["ordered_date"];
    delete ele["refund_id"];
    delete ele["net_amount"];
    delete ele["total_amount"];
    delete ele["offer_amount"];
    delete ele["final_order_amount"];

    final_data["items"] = data;
  });
  client.end()
  res
    .status(200)
    .send({ success: true, message: "Order Items", data: final_data });
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

change_order_status = async (order_id) => {
  const client = new Client(credentials);
  client.connect();

  const status = ["pending", "processing", "dispatched", "delivered"];

  let itemQuery = `SELECT item_status FROM aqai.order_items WHERE order_id = ${order_id}`;
  const itemResult = await client.query(itemQuery);
  let obj = {
    pending: 0,
    processing: 0,
    dispatched: 0,
    delivered: 0,
    cancelled: 0,
  };

  for (let i = 0; i < itemResult.rows.length; i++) {
    if (itemResult.rows[i].item_status == "delivered") {
      obj["delivered"] += 1;
    } else if (itemResult.rows[i].item_status == "dispatched") {
      obj["dispatched"] += 1;
    } else if (itemResult.rows[i].item_status == "processing") {
      obj["processing"] += 1;
    } else if (itemResult.rows[i].item_status == "cancelled") {
      obj["cancelled"] += 1;
    } else {
      obj["pending"] += 1;
    }
  }

  let order_status;
  if (obj["delivered"] == itemResult.rows.length) {
    order_status = "delivered";
  } else if (
    obj["delivered"] > 0 &&
    obj["pending"] == 0 &&
    obj["processing"] == 0 &&
    obj["dispatched"] == 0
  ) {
    order_status = "delivered";
  } else if (
    obj["delivered"] !== 0 &&
    obj["delivered"] < itemResult.rows.length
  ) {
    order_status = "partially delivered";
  } else if (
    obj["dispatched"] > 0 &&
    obj["dispatched"] < itemResult.rows.length
  ) {
    order_status = "partially dispatched";
  } else if (obj["dispatched"] == itemResult.rows.length) {
    order_status = "dispatched";
  } else if (
    obj["processing"] > 0 &&
    obj["processing"] < itemResult.rows.length
  ) {
    order_status = "partially processing";
  } else if (obj["processing"] == itemResult.rows.length) {
    order_status = "processing";
  } else if (
    obj["cancelled"] > 0 &&
    obj["cancelled"] < itemResult.rows.length
  ) {
    order_status = "partially cancelled";
  } else if (obj["cancelled"] == itemResult.rows.length) {
    order_status = "cancelled";
  } else {
    order_status = "pending";
  }
  let query = `UPDATE aqai.orders SET order_status = '${order_status}' WHERE id = ${order_id} `;
  const result = await client.query(query);
  client.end()
};

exports.change_item_status = async (req, res) => {
  let { items, sales_person, order_id, phone, time } = req.body;
  console.log(items, sales_person, order_id, phone, time);
  const client = new Client(credentials);
  client.connect();

  items.forEach(async (item) => {
    const date = moment().format("DD/MM/YYYY");
    // const time = moment().utc().local().format("DD-MM-YYYY, HH:mm:ss");

    let status_object = {
      from_status: item.from_status,
      to_status: item.to_status,
      changed_by: sales_person,
      changed_date: date,
      changed_time: time,
    };

    status_object = JSON.stringify(status_object);

    reason = item.reason ? `'${item.reason}'` : `${null}`;

    let query = `UPDATE aqai.order_items SET item_status = '${item.to_status}', quantity = ${item.quantity}, line_total = '${item.line_total}' ,reason= ${reason},
    status_log = status_log || '${status_object}' WHERE "id"=${item.order_item_id} returning id`;
    let result = await client.query(query);

    change_order_status(order_id);

    ///////////////////////// SMS for status change in OMS - Start ////////////////////////////////
    if (item.to_status == "processing" || item.to_status == "dispatched") {
      let msgBody;
      let title;
      let notificationBody;
      let trait;

      if (item.to_status == "processing") {
        msgBody = `Your order with Order ID ${order_id} is being processed. We will update once it is dispatched`;
        title = "Order Processed";
        notificationBody = `Your order with Order ID ${order_id} is being processed. We will update once it is dispatched`;
        trait = {
          OMS_order_ID: order_id,
          OMS_order_product: item.product_name,
        };
      }

      if (item.to_status == "dispatched") {
        msgBody = `Your order with Order ID ${order_id} has been dispatched. You can call our support executive for assistance.`;
        title = "Order Dispatched";
        notificationBody = `You order with Order ID ${order_id} has been dispatched. You can call our support executive for assistance.`;
        trait = {
          OMS_dispatch_ID_V2: order_id,
          OMS_dispatch_date_V2: moment().format("DD/MM/YYYY"),
        };
      }

      let data = JSON.stringify({
        to_number: phone,
        msg_data: msgBody,
      });

      let smsConfig = {
        method: "post",
        url: "https://message-node-adk24f4fea-uc.a.run.app/api/v1/sms",
        headers: {
          Authorization: "Basic YXFhaUFQSTphcWFpQGduaWdhc3NlbQ==",
          "Content-Type": "application/json",
        },
        data: data,
      };
      axios(smsConfig)
        .then(function (resp) {
          // console.log(resp);
        })
        .catch(function (error) {
          // console.log(error);
        });

      ///////////////////////// Whatsapp for status change in OMS - End ////////////////////////////////

      let inputData = JSON.stringify({
        phone: phone,
        traitData: trait,
      });

      let whatsappConfig = {
        method: "post",
        url: "https://message-node-adk24f4fea-uc.a.run.app/api/v1/whatsapp",
        headers: {
          Authorization: "Basic YXFhaUFQSTphcWFpQGduaWdhc3NlbQ==",
          "Content-Type": "application/json",
        },
        data: inputData,
      };
      console.log("line no.710", data);

      axios(whatsappConfig).catch(function (error) {
        // console.log(error);
      });
      ///////////////////////// Whatsapp for status change in OMS - End ////////////////////////////////
      let get_customer_query = `SELECT device_token, device_type FROM aqai.customers WHERE phone = ${phone}`;
      console.log("line no.719", get_customer_query);

      let get_customer = await client.query(get_customer_query);
      let device = [...get_customer.rows];

      console.log(device);

      if (device[0].device_token && device[0].device_type) {
        let url_noti;
        if (device[0].device_type == "android") {
          url_noti =
            "https://notification-node-dev-loq5g64vpq-uc.a.run.app/api/v1/android-notification";
        } else if (device[0].device_type == "ios") {
          url_noti =
            "https://notification-node-dev-loq5g64vpq-uc.a.run.app/api/v1/ios-notification";
        }

        let n_data = JSON.stringify({
          device_token: device[0].device_token,
          title: title,
          body: notificationBody,
          click_action: {
            tag: "order_status_change",
            action: 1,
            order_id: order_id,
          },
        });

        let notiConfig = {
          method: "post",
          url: url_noti,
          headers: {
            "Content-Type": "application/json",
          },
          data: n_data,
        };

        axios(notiConfig).catch(function (error) {
          // console.log(error);
        });
      }
    }
  });

  ///////////////////////// SMS for status change in OMS - End ////////////////////////////////

  res.status(201).send({
    success: true,
    message: `Your order with order id : # ${items.order_id} is cancelled successfully`,
  });
};

exports.change_item_cancel = async (req, res) => {
  let {
    order_id,
    order_item_id,
    from_status,
    to_status,
    reason,
    sales_person,
    net_amount,
    phone,
    time,
  } = req.body;
  const client = new Client(credentials);
  client.connect();

  const date = moment().format("DD/MM/YYYY");
  // const time = moment().utc().local().format("DD-MM-YYYY, HH:mm:ss");

  let status_object = {
    from_status: from_status,
    to_status: to_status,
    changed_by: sales_person,
    changed_date: date,
    changed_time: time,
  };

  reason = reason ? `'${reason}'` : `${null}`;
  status_object = JSON.stringify(status_object);

  let query = ` UPDATE aqai.order_items SET item_status = '${to_status}', reason = ${reason} ,
  status_log = status_log || '${status_object}' WHERE "id"= ${order_item_id} returning id`;

  let result = await client.query(query);

  change_order_status(order_id);
  if (to_status == "cancelled") {
    ///////////////////////// SMS for status change in OMS - Start ////////////////////////////////
    let tollFree = "04446314390";
    let msgBody = `Your order ID ${order_id} has been cancelled. Please log on to AQAI app for more information or call to our toll free number - ${tollFree} `;

    let data = JSON.stringify({
      to_number: phone,
      msg_data: msgBody,
    });

    let smsConfig = {
      method: "post",
      url: "https://message-node-adk24f4fea-uc.a.run.app/api/v1/sms",
      headers: {
        Authorization: "Basic YXFhaUFQSTphcWFpQGduaWdhc3NlbQ==",
        "Content-Type": "application/json",
      },
      data: data,
    };
    axios(smsConfig)
      .then(function (resp) {
        // console.log(resp);
      })
      .catch(function (error) {
        console.log(error);
      });
    ///////////////////////// SMS for status change in OMS - End ////////////////////////////////

    ///////////////////////// Whatsapp for status change in OMS - End ////////////////////////////////
    let trait = {
      Mar_ord_can_id: order_id,
      Mar_ord_can_toll: "04446314390",
    };

    let inputData = JSON.stringify({
      phone: phone,
      traitData: trait,
    });

    let whatsappConfig = {
      method: "post",
      url: "https://message-node-adk24f4fea-uc.a.run.app/api/v1/whatsapp",
      headers: {
        Authorization: "Basic YXFhaUFQSTphcWFpQGduaWdhc3NlbQ==",
        "Content-Type": "application/json",
      },
      data: inputData,
    };

    axios(whatsappConfig).catch(function (error) {
      console.log(error);
    });
    ///////////////////////// Whatsapp for status change in OMS - End ////////////////////////////////
    let get_customer_query = `SELECT device_token, device_type FROM aqai.customers WHERE phone = ${phone}`;
    let get_customer = await client.query(get_customer_query);
    let device = [...get_customer.rows];

    if (device[0].device_token && device[0].device_type) {
      let url_noti;
      if (device[0].device_type == "android") {
        url_noti =
          "https://notification-node-dev-loq5g64vpq-uc.a.run.app/api/v1/android-notification";
      } else if (device[0].device_type == "ios") {
        url_noti =
          "https://notification-node-dev-loq5g64vpq-uc.a.run.app/api/v1/ios-notification";
      }

      let n_data = JSON.stringify({
        device_token: device[0].device_token,
        title: "Order Cancelled",
        body: `You order with Order ID ${order_id} has been cancelled.`,
        click_action: {
          tag: "order_status_change",
          action: 1,
          order_id: order_id,
        },
      });

      let notiConfig = {
        method: "post",
        url: url_noti,
        headers: {
          "Content-Type": "application/json",
        },
        data: n_data,
      };

      axios(notiConfig).catch(function (error) {
        console.log(error);
      });
    }
  }

  res.status(201).send({
    success: true,
    message: `Your order with order id : # ${order_id} is cancelled successfully`,
  });
};

exports.update_final_quantity = async (req, res) => {
  const {
    item_quantity,
    order_item_id,
    from_status,
    to_status,
    sales_person,
    net_amount,
    order_id,
    phone,
    time,
  } = req.body;

  const client = new Client(credentials);
  client.connect();
  const date = moment().format("DD/MM/YYYY");
  // const time = moment().utc().local().format("DD-MM-YYYY, HH:mm:ss");
  let status_object = {
    from_status: from_status,
    to_status: to_status,
    changed_by: sales_person,
    changed_date: date,
    changed_time: time,
  };
  status_object = JSON.stringify(status_object);

  let query = `with amount_update AS (UPDATE aqai.orders SET net_amount = '${net_amount}' WHERE "id"='${order_id}' returning *)
   UPDATE aqai.order_items SET item_status = '${to_status}',status_log = status_log || '${status_object}',
  final_quantity = '${item_quantity}' WHERE "id"=${order_item_id} returning *`;

  const result = await client.query(query);
  change_order_status(order_id);

  if(!result.rows.length){
    res.status(500).send({ success: false, message: "Something went wrong" });
  }
  ///////////////////////// SMS for status change in OMS - Start ////////////////////////////////
  if (to_status == "delivered") {
    let link =
      "https://forms.zohopublic.in/aqgromalinfarmtechservicespr/form/FeedbackChat/formperma/rFua23QQasPT9QdwUR3t4MqTwsBzlMvsHGZ1yY58_3U";
    let msgBody = `Dear Customer, Your Order ID ${order_id} has been delivered. Please acknowledge your delivery feedback on ${link}. Keep shopping with us!`;

    let data = JSON.stringify({
      to_number: phone,
      msg_data: msgBody,
    });

    let smsConfig = {
      method: "post",
      url: "https://message-node-adk24f4fea-uc.a.run.app/api/v1/sms",
      headers: {
        Authorization: "Basic YXFhaUFQSTphcWFpQGduaWdhc3NlbQ==",
        "Content-Type": "application/json",
      },
      data: data,
    };
    axios(smsConfig)
      .then(function (resp) {
        // console.log(resp);
      })
      .catch(function (error) {
        // console.log(error);
      });
    ///////////////////////// SMS for status change in OMS - End ////////////////////////////////

    ///////////////////////// Whatsapp for status change in OMS - End ////////////////////////////////
    let trait = {
      Mar_ord_upd_id: order_id,
      Mar_ord_upd_feedback:
        "https://forms.zohopublic.in/aqgromalinfarmtechservicespr/form/FeedbackChat/formperma/rFua23QQasPT9QdwUR3t4MqTwsBzlMvsHGZ1yY58_3U",
    };

    let inputData = JSON.stringify({
      phone: phone,
      traitData: trait,
    });

    let whatsappConfig = {
      method: "post",
      url: "https://message-node-adk24f4fea-uc.a.run.app/api/v1/whatsapp",
      headers: {
        Authorization: "Basic YXFhaUFQSTphcWFpQGduaWdhc3NlbQ==",
        "Content-Type": "application/json",
      },
      data: inputData,
    };

    axios(whatsappConfig).catch(function (error) {
      // console.log(error);
    });

    ///////////////////////// Whatsapp for status change in OMS - End ////////////////////////////////

    let get_customer_query = `SELECT device_token, device_type FROM aqai.customers WHERE phone = ${phone}`;
    let get_customer = await client.query(get_customer_query);
    let device = [...get_customer.rows];

    if (device[0].device_token && device[0].device_type) {
      let url_noti;
      if (device[0].device_type == "android") {
        url_noti =
          "https://notification-node-dev-loq5g64vpq-uc.a.run.app/api/v1/android-notification";
      } else if (device[0].device_type == "ios") {
        url_noti =
          "https://notification-node-dev-loq5g64vpq-uc.a.run.app/api/v1/ios-notification";
      }

      let n_data = JSON.stringify({
        device_token: device[0].device_token,
        title: "Order Delivered",
        body: `You order with Order ID ${order_id} has been delivered. Thank you for ordering with us.`,
        click_action: {
          tag: "order_status_change",
          action: 1,
          order_id: order_id,
        },
      });

      let notiConfig = {
        method: "post",
        url: url_noti,
        headers: {
          "Content-Type": "application/json",
        },
        data: n_data,
      };

      axios(notiConfig).catch(function (error) {
        // console.log(error);
      });
    }
  }

  if (result.rows) {
    let updated_order_id = result.rows[0];
    client.end()
    res.status(201).send({
      success: true,
      message: `Your order with order id : # ${order_item_id} is delivered successfully`,
    });
  }
};

exports.update_final_order_amount = async (req, res) => {
  const {
    from_status,
    to_status,
    sales_person,
    order_id,
    final_order_amount,
    order_item_ids,
    final_quantity,
    payment_id,
    payment_type,
  } = req.body;

  const client = new Client(credentials);
  client.connect();
  const date = moment().format("YYYY/MM/DD");
  let status_object = {
    from_status: from_status,
    to_status: to_status,
    changed_by: sales_person,
    changed_date: date,
  };

  status_object = JSON.stringify(status_object);
  let query;
  let result;
  for (var i = 0; i < final_quantity.length; i++) {
    query = `with order_update AS (UPDATE aqai.orders SET net_amount = ${final_order_amount}, final_order_amount = ${final_order_amount}, order_status = '${to_status}'
    WHERE "id"=${order_id} returning *)
   UPDATE aqai.order_items SET item_status = '${to_status}', final_quantity = '${final_quantity[i]}', status_log = '${status_object}' 
   WHERE "order_id"='${order_id}' AND "id" = '${order_item_ids[i]}' returning *`;

    result = await client.query(query);
    !result.rows.length &&
      res.status(500).send({ success: false, message: "Something went wrong" });
  }

  if (result.rows) {
    let updated_order_id = result.rows[0];
    client.end()
    res.status(201).send({
      success: true,
      message: `Your order with order id : # ${order_id} is delivered successfully`,
    });
  }
};

exports.download_order_data = async (req, res) => {
  const { from_date, to_date } = req.query;
  const client = new Client(credentials);
  client.connect();
  let query = `SELECT o.id AS order_id,o.ordered_date,(SELECT name_en FROM aqai.product_categories pc
     WHERE pc.id = (SELECT p.product_category_id FROM aqai.products p WHERE p.id = oi.product_id)) AS category_name,
     (SELECT name_en FROM aqai.products p WHERE p.id = oi.product_id) 
     AS product_name,oi.product_price,oi.discounted_price,oi.quantity,o.customer_id,o.customer_name,o.customer_executive_id,
     oi.item_status,o.customer_mobile,o.delivery_address,o.delivery_pincode,(SELECT l.state_name FROM aqai.logistics l 
      WHERE l.pincode =o.delivery_pincode LIMIT 1) 
      AS state,o.order_type,o.sales_order_no,o.payment_type,o.payment_id,o.online_paid_amount,o.coupon_used,o.offer_amount,oi.id AS item_id,o.device_type 
      FROM aqai.orders o LEFT JOIN aqai.order_items oi ON o.id =oi.order_id WHERE o.ordered_date >= '${from_date}' AND o.ordered_date <= '${to_date}' ORDER BY oi.id DESC`;
  let result = await client
    .query(query)
    .then((resp) => {
      resp.rows.forEach((ord) => {
        ord["ordered_date"] = moment(ord["ordered_date"])
          .utc()
          .format("DD/MM/YYYY");
      });
      client.end()
      res.status(200).send({
        status: true,
        msg: "Current Data of orders",
        data: resp.rows,
      });
    })
    .catch((err) => {
      client.end()
      console.log(err)
    });
};
