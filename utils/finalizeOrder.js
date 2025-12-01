const mongoose = require('mongoose')
const Order = require('../models/orderSchema')
const Product = require('../models/productSchema')
const Wallet = require('../models/walletSchema')
const Cart = require('../models/cartSchema')
const Coupon = require('../models/couponSchema')

async function finalizeOrder({ orderId, userId, paymentMethod, paymentDetails = {} }) {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const order = await Order.findById(orderId).session(session)
    if (!order) throw new Error("Order not found")

    if (order.orderStatus === "PLACED") {
      await session.commitTransaction()
      session.endSession()
      return order
    }

    if (paymentMethod === "WALLET") {
      const wallet = await Wallet.findOne({ user_id: userId }).session(session)
      if (!wallet) throw new Error("Wallet not found")
      if (wallet.balance < order.totalAmount) throw new Error("Insufficient balance")

      wallet.balance -= order.totalAmount

      wallet.transactions.push({
        amount: order.totalAmount,
        type: "DEBIT",
        description: `Order Payment for #${order._id}`,
        orderId: order._id.toString(),
        createdAt: new Date(),
      })

      await wallet.save({ session })
    }

    for (const item of order.items) {

      const productId = new mongoose.Types.ObjectId(String(item.product))
      const variantId = new mongoose.Types.ObjectId(String(item.variantId))

      const updated = await Product.updateOne({_id: productId,"variants._id": variantId},{$inc: { "variants.$.stock": -item.quantity }},{ session })

      if (updated.modifiedCount === 0) {
        throw new Error(`FAILED to reduce stock for product ${item.product}, variant ${item.variantId}`);
      }
    }

    order.paymentStatus = "COMPLETED"
    order.orderStatus = "PLACED"
    order.paymentMethod = paymentMethod
    order.paymentDetails = paymentDetails

    await order.save({ session })

    if(order.coupon) {
        await Coupon.findByIdAndUpdate(
            order.coupon,
            {$addToSet:{usedBy:userId},$inc:{usageCount:1}},
            {session}
        )
    }

    await Cart.updateOne(
      { user_id: userId },
      { $set: { items: [] } },
      { session }
    );

    await session.commitTransaction()
    session.endSession()
    return order

  } catch (err) {
    console.error("FINALIZE ERROR:", err)
    await session.abortTransaction()
    session.endSession()
    throw err
  }
}

module.exports = finalizeOrder
