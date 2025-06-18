const express = require("express");
const router = express.Router({ mergeParams: true });
const customerController = require("../controllers/customerController");
const auth = require("../controllers/authController");
router.post(
  "/createprofile",
  auth.protect,
  customerController.uploadCustomerImage,
  customerController.resizeImage,
  customerController.getIdformreq,
  customerController.createProfile
);
router.get(
  "/:customerId/getprofile",
  auth.protect,
  customerController.setcustmerIdTobody,
  customerController.getOneProfile
);
router.put(
  "/updateprofile/:id",
  auth.protect,
  customerController.getIdformreq,
  customerController.updateOneProfile
);
router.delete(
  "/deleteprofile/:id",
  auth.protect,
  customerController.getIdformreq,
  customerController.deleteOneProfile
);
module.exports = router;
