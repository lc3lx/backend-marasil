const express = require("express");
const {
  createCustomerContract,
  getCustomerContracts,
  getCustomerContractsByCustomer,
  getCustomerContract,
  updateCustomerContract,
  toggleContractActive,
  deleteCustomerContract,
} = require("../controllers/customerContractController");

const router = express.Router();

// حماية جميع الروابط
const { protect, allowedTo } = require("../middlewares/authMiddleware");
router.use(protect);
router.use(allowedTo("admin"));

router.route("/")
  .get(getCustomerContracts)
  .post(createCustomerContract);

router.route("/customer/:customerId")
  .get(getCustomerContractsByCustomer);

router.route("/:id")
  .get(getCustomerContract)
  .put(updateCustomerContract)
  .delete(deleteCustomerContract);

router.patch("/:id/toggle-active", toggleContractActive);

module.exports = router;
