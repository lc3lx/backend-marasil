const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const customerSchema = new mongoose.Schema(
  {
    password: {
      type: String,
      required: true,
    },
    passwordChangedAt: Date,
    passwordResetCode: String,
    passwordResetExpires: Date,
    passwordResetVerified: Boolean,

    firstName: { type: String },
    lastName: { type: String },
    phone: { type: Number, required: false },
    compnyName: String,
    storName: String,
    email: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },

    role: {
      type: String,
      enum: ["user", "manager", "admin", "superadmin","employee"],
      default: "user",
    },
  },
  { timestamps: true }
);
customerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

const customer = mongoose.model("Customer", customerSchema);

module.exports = customer;
