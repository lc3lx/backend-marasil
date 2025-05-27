const express = require("express");

const router = express.Router();
const { protect, allowedTo } = require("../controllers/authController");

router.use(protect);

const {
  updatecleintAddress,
  getcleintAddress,
  getoneCleintAddress,
  createcleintAddress,
  deletecleintAddress,
} = require("../controllers/clientAddressController");

const orderRoutes = require("./orderManuallyRoutes");
router.use("/:clientid/orders", orderRoutes);

router.route("/").get(getcleintAddress).post(createcleintAddress);
router
  .route("/:id")
  .get(getoneCleintAddress)
  .put(updatecleintAddress)
  .delete(deletecleintAddress);

module.exports = router;
