function computeItemRefund(item, order = {}) {
  const unitActual = Number(item.actualPrice) || 0;
  const qty = Math.max(Number(item.quantity) || 1, 1);
  const unitOfferPrice = Number(item.offerPrice) || unitActual;

  const itemActualTotal = unitActual * qty
  const itemOfferTotal = Math.max((unitActual - unitOfferPrice) * qty, 0)

  const orderActualTotal = Number(order.actualTotal) || 0
  const orderSubtotal = Number(order.subtotal) || 0

  let orderBase = orderActualTotal || orderSubtotal
  if (!orderBase || orderBase <= 0) {
    if (Array.isArray(order.items) && order.items.length > 0) {
      orderBase = order.items.reduce((s, it) => {
        const a = (Number(it.actualPrice) || 0) * (Number(it.quantity) || 1)
        return s + a
      }, 0)
    } else {
      orderBase = 1
    }
  }

  const orderCoupon = Number(order.couponDiscount) || 0
  const itemPortion = orderBase > 0 ? (itemActualTotal / orderBase) : 0
  const itemCouponTotal = Math.max(orderCoupon * itemPortion, 0)

  let taxableBase = itemActualTotal - itemOfferTotal - itemCouponTotal
  if (taxableBase < 0) taxableBase = 0

  const TAX_RATE = 0.02
  const tax = taxableBase * TAX_RATE

  const refundAmount = taxableBase + tax

  const rounded = Math.round(refundAmount * 100) / 100

  return {
    refundAmount: rounded,
    breakdown: {
      itemActualTotal: Math.round(itemActualTotal * 100) / 100,
      itemOfferTotal: Math.round(itemOfferTotal * 100) / 100,
      itemCouponTotal: Math.round(itemCouponTotal * 100) / 100,
      taxableBase: Math.round(taxableBase * 100) / 100,
      tax: Math.round(tax * 100) / 100,
    },
  }
}

module.exports = {computeItemRefund}