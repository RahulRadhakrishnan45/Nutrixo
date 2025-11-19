const Order = require("../models/orderSchema")
const Product = require("../models/productSchema")
const Cart = require("../models/cartSchema")
const applyOffersToProduct = require("./applyOffer")

module.exports.createOrderAndFinalize = async function ({
  userId,
  selectedAddress,
  paymentMethod,
  paymentStatus,
  updatedItems,
  appliedCoupon,
  activeOffers,
  actualTotal,
  offerDiscount,
  subtotal,
  couponDiscount,
  tax,
  totalAmount,
  totalDiscount,
}) {
  const orderItem = [];
  const subtotalBeforeCoupon = subtotal

  for (const item of updatedItems) {
    const product = item.product_id
    const variant = product.variants.find(
      (v) => v._id.toString() === item.variant_id.toString()
    );

    const offeredProduct = await applyOffersToProduct(product, activeOffers)
    const offeredVariant = offeredProduct.variants.find(
      (v) => v._id.toString() === variant._id.toString()
    );

    const basePrice = variant.price
    const finalPrice = offeredVariant?.calculated_price || variant.price
    const quantity = item.quantity

    const itemSubtotal = finalPrice * quantity

    let itemCouponShare = 0

    if (subtotalBeforeCoupon > 0 && couponDiscount > 0) {
      itemCouponShare = (itemSubtotal / subtotalBeforeCoupon) * couponDiscount
    }

    itemCouponShare = Number(itemCouponShare.toFixed(2))

    let taxBase = basePrice * quantity

    if (finalPrice < basePrice && itemCouponShare === 0) {
      taxBase = basePrice * quantity
    } else if (finalPrice < basePrice && itemCouponShare > 0) {
      taxBase = (finalPrice * quantity) - itemCouponShare
    }

    const itemTax = Number((taxBase * 0.02).toFixed(2))

    orderItem.push({
      product: product._id,
      variantId: variant._id,
      title: product.title,
      flavour: variant.flavour,
      size: variant.size,
      image: variant.images?.[0] || null,
      actualPrice: basePrice,
      offerPrice: finalPrice,
      couponDiscount: itemCouponShare,
      price: finalPrice,
      quantity,
      totalPrice: finalPrice * quantity,
      taxBase,
      tax: itemTax,
      discount: (basePrice - finalPrice) * quantity,
      offerApplied: offeredVariant?.offerPercent || 0,
    })
  }

  const addr = {
    fullname: selectedAddress.fullname,
    mobile: selectedAddress.mobile,
    address: selectedAddress.address,
    district: selectedAddress.district,
    state: selectedAddress.state,
    country: selectedAddress.country,
    pincode: selectedAddress.pincode,
  };

  const order = await Order.create({
    user: userId,
    orderAddress: addr,
    paymentMethod,
    paymentStatus,
    actualTotal,
    offerDiscount,
    subtotal,
    couponDiscount,
    tax,
    totalAmount,
    totalDiscount,
    items: orderItem,
    coupon: appliedCoupon?._id || null,
  });

  for (const item of orderItem) {
    await Product.updateOne(
      { _id: item.product, "variants._id": item.variantId },
      { $inc: { "variants.$.stock": -item.quantity } }
    );
  }

  await Cart.updateOne({ user_id: userId }, { $set: { items: [] } })

  return order;
};
