const pkg = require("pg");
const { Client } = pkg;
const moment = require("moment");
const dotenv = require("dotenv"); //package to use dotenv

// Set up Global configuration access
dotenv.config();
credentials = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
};

exports.get_timed_sales_data = async (req, res) => {
    let { start_date, end_date } = req.query;
    start_date = moment(start_date).format("YYYY-MM-DD");
    end_date = moment(end_date).format("YYYY-MM-DD");
    const client = new Client(credentials);
    client.connect();

    let query = `SELECT id,net_amount,offer_amount,order_status,to_char(ordered_date, 'YYYY-MM-DD') as order_date FROM aqai.orders WHERE ordered_date BETWEEN '${start_date}' AND '${end_date}'`;
    let result = await client.query(query).catch((error) => {
        res.status(500).send({ success: false, message: "Data not found", data: error });
    });

    let orders = [...result.rows];
    let response = [];
    let c_index = 0;
    let date_index = {};

    orders.forEach((element) => {
        let date = element.order_date;

        if (date_index[date]) {
            let index = date_index[date];
            response[index]["total_orders"] += 1;
            response[index]["total_revenue"] = +response[index]["total_revenue"] + +element.net_amount;
            response[index][element.order_status]
                ? (response[index][element.order_status] += 1)
                : (response[index][element.order_status] = 1);
        } else {
            date_index[date] = c_index;
            response[c_index] = {};
            response[c_index]["date"] = date;
            response[c_index]["total_orders"] = 1;
            response[c_index][element.order_status] = 1;
            response[c_index]["total_revenue"] = element.net_amount;
            c_index++;
        }
    });
    client.end()
    res.status(200).send({ status: true, msg: "Order data ", data: response });
};
