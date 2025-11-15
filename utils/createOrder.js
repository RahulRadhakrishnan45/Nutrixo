const Order = require("../models/orderSchema");
const Product = require("../models/productSchema");
const Cart = require("../models/cartSchema");
const applyOffersToProduct = require("./applyOffer");

// MAIN FUNCTION
module.exports.createOrderAndFinalize = async function ({
  userId,
  selectedAddress,
  paymentMethod,
  paymentStatus,
  updatedItems,
  appliedCoupon,
  activeOffers,
  subtotal,
  couponDiscount,
  tax,
  total,
}) {
  // CREATE ORDER ITEMS
  const orderItem = [];

  for (const item of updatedItems) {
    const product = item.product_id;
    const variant = product.variants.find(
      (v) => v._id.toString() === item.variant_id.toString()
    );

    const offeredProduct = await applyOffersToProduct(product, activeOffers);
    const offeredVariant = offeredProduct.variants.find(
      (v) => v._id.toString() === variant._id.toString()
    );

    const finalPrice = offeredVariant?.calculated_price || variant.price;
    const basePrice = variant.price;

    orderItem.push({
      product: product._id,
      variantId: variant._id,
      title: product.title,
      flavour: variant.flavour,
      size: variant.size,
      image: variant.images?.[0] || null,
      price: finalPrice,
      quantity: item.quantity,
      totalPrice: finalPrice * item.quantity,
      tax: Number((finalPrice * item.quantity * 0.02).toFixed(2)),
      discount: (basePrice - finalPrice) * item.quantity,
      offerApplied: offeredVariant?.offerPercent || 0,
    });
  }

  // EMBEDDED ADDRESS
  const addr = {
    fullname: selectedAddress.fullname,
    mobile: selectedAddress.mobile,
    address: selectedAddress.address,
    district: selectedAddress.district,
    state: selectedAddress.state,
    country: selectedAddress.country,
    pincode: selectedAddress.pincode,
  };

  // CREATE ORDER DOCUMENT
  const order = await Order.create({
    user: userId,
    orderAddress: addr,
    paymentMethod,
    paymentStatus,
    subtotal,
    couponDiscount,
    tax,
    totalAmount: total,
    items: orderItem,
    coupon: appliedCoupon?._id || null,
  });

  // DEDUCT STOCK
  for (const item of orderItem) {
    await Product.updateOne(
      { _id: item.product, "variants._id": item.variantId },
      { $inc: { "variants.$.stock": -item.quantity } }
    );
  }

  // EMPTY CART
  await Cart.updateOne({ user_id: userId }, { $set: { items: [] } });

  return order;
};
