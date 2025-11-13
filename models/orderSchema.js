const mongoose = require("mongoose");
const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    orderAddress: {
      fullname: { type: String, required: true },
      mobile: { type: String, required: true },
      address: { type: String, required: true },
      district: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"],
      default: "PENDING",
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "CARD", "WALLET", "BANK"],
      default: "COD",
    },
    paymentDetails: { transactionId: String, paidAt: Date },
    actualTotal: { type: Number, default: 0 },
    offerDiscount: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    couponDiscount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    totalOfferApplied: { type: Number, default: 0 },
    orderNumber: { type: String, unique: true },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "product",
          required: true,
        },
        variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
        title: { type: String, required: true },
        flavour: String,
        size: String,
        image: String,
        price: { type: Number, required: true }, // final applied price
        quantity: { type: Number, required: true },
        totalPrice: { type: Number, required: true },

        tax: Number,
        discount: Number,
        offerApplied: Number,

        status: {
          type: String,
          enum: [
            "PROCESSING",
            "PACKED",
            "SHIPPED",
            "CANCELLATION REQUESTED",
            "DELIVERED",
            "RETURN REQUESTED",
            "CANCELLED",
            "RETURNED",
          ],
          default: "PROCESSING",
        },
        previousStatus: {type: String},       
        statusHistory: [
          {
            status: String,
            timestamp: { type: Date, default: Date.now },
            note: String,
          },
        ],
        expectedDelivery: {
          type: Date,
          default: () => {
            const date = new Date();
            date.setDate(date.getDate() + 7);
            return date;
          },
        },
        returnRequest: {
          status: {
            type: String,
            enum: ["NONE", "REQUESTED", "APPROVED", "REJECTED", "COMPLETED"],
            default: "NONE",
          },
          reason: String,
          requestedAt: Date,
          resolvedAt: Date,
          refundAmount: Number,
        },
        cancellationRequest: {
          status: {
            type: String,
            enum: ["NONE", "REQUESTED", "APPROVED", "REJECTED"],
            default: "NONE",
          },
          reason: String,
          requestedAt: Date,
          resolvedAt: Date,
          refundAmount: Number,
        },
      },
    ],
  },
  { timestamps: true }
);

orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase(); // 5-char alphanumeric
    const timePart = Date.now().toString().slice(-4); // last 4 digits of timestamp
    this.orderNumber = `NUT-${randomPart}${timePart}`;
  }
  next();
});

orderSchema.pre("save",function (next) {
  const allStatus = this.items.map((item) => item.status)

  if(this.paymentStatus === 'FAILED') return next()

  if(allStatus.every((s) => s === 'RETURNED')) {
    this.paymentStatus = 'REFUNDED'
  }
  else if(this.paymentStatus === 'COD' && allStatus.every((s) => s === 'DELIVERED')) {
    this.paymentStatus = 'COMPLETED'
  }
  else if(this.paymentStatus !== 'COD' && allStatus.every((s) => s === 'DELIVERED')) {
    this.paymentStatus = 'COMPLETED'
  }
  else if(allStatus.some((s) => ["PROCESSING", "PACKED", "SHIPPED", "RETURN REQUESTED", "CANCELLATION REQUESTED"].includes(s))) {
    this.paymentStatus = 'PENDING'
  }
  else if(allStatus.every((s) => s === 'CANCELLED')) {
    this.paymentStatus = 'FAILED'
  }

  next()
})

module.exports = mongoose.model("Order", orderSchema);
