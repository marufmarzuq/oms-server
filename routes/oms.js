const express = require("express");
const router = express.Router();
const verify = require("../middleware/auth");

var { login } = require("../controllers/admin");
var { get_all_products } = require("../controllers/product");
var { forgot_password } = require("../controllers/admin");
var { change_password } = require("../controllers/admin");
var { add_customer } = require("../controllers/customer");
var { get_customer } = require("../controllers/customer");
var { get_all_customers } = require("../controllers/customer");
var { update_customer } = require("../controllers/customer");
var { get_timed_sales_data } = require("../controllers/graph");
var { place_order, change_item_cancel } = require("../controllers/order");
var { get_all_orders } = require("../controllers/order");
var { update_final_order_amount } = require("../controllers/order");
var { get_open_orders } = require("../controllers/order");
var { change_item_status } = require("../controllers/order");
var { update_final_quantity } = require("../controllers/order");
var { get_order_details } = require("../controllers/order");
// var { change_order_status } = require("../controllers/order");
var { get_open_orders } = require("../controllers/order");
const { get_overall_kpi } = require("../controllers/dashboard");
const { get_order_type_kpi } = require("../controllers/dashboard");
const { download_order_data } = require("../controllers/order");
const {
  get_admin_detail,
  update_order_admin,
  get_my_orders,
  get_status_history,
  get_state,
  change_details,
} = require("../controllers/myOrders");
const { get_sales_order } = require("../controllers/third_party");
const { get_all_feedbacks } = require("../controllers/feedback");
const {
  getSalesOrderReport,
  getProductReports,
  getStatusLogReports,
  getSalesWidget,
} = require("../controllers/reports");

router.post("/login", login);
router.get("/get-all-products", get_all_products);
router.post("/add-customer", add_customer);
router.get("/get-customer", get_customer);
router.get("/get-all-customers", get_all_customers);
router.post("/update-customer", update_customer);
router.get("/get-sales-data", get_timed_sales_data);
router.post("/add-order", place_order);
router.get("/get-all-orders", get_all_orders);
router.get("/get-order-details", get_order_details);
// router.post("/change-order-status", change_order_status);
router.post("/forgot-password", forgot_password);
router.post("/change-password", change_password);
router.get("/get-open-orders", get_open_orders);
router.get("/get-overall-kpi", get_overall_kpi);
router.post("/update-final-quantity", update_final_quantity);
router.post("/update-final-order-amount", update_final_order_amount);
router.post("/change-item-status", change_item_status);
router.get("/get-order-type-kpi", get_order_type_kpi);
router.get("/download-order-data", download_order_data);
router.post("/change-item-cancel", change_item_cancel);
router.get("/get-admin-detail", get_admin_detail);
router.get("/update-order-admin", update_order_admin);
router.get("/get-my-orders", get_my_orders);
router.post("/get-sales-order", get_sales_order);
router.get("/get-status-history", get_status_history);
router.get("/get-state", get_state);
router.post("/get-all-feedbacks", get_all_feedbacks);
router.post("/change-details", change_details);
router.get("/get-so-reports", getSalesOrderReport);
router.get("/get-status-reports", getStatusLogReports);
router.get("/get-product-reports", getProductReports);
router.get("/get-sales-widget", getSalesWidget);
module.exports = router;
