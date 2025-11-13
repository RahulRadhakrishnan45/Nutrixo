// utils/applyOffer.js
const Offer = require('../models/offerSchema');

async function applyOffersToProduct(product, activeOffers = null) {
  const now = new Date();

  // 🧭 Fetch all currently active offers if not already provided
  if (!activeOffers) {
    activeOffers = await Offer.find({
      isActive: true,
      validFrom: { $lte: now },
      validTo: { $gte: now },
    }).lean();
  }

  const productId = product._id?.toString();
  const brandId =
    product.brand_id?._id?.toString() ||
    product.brand_id?.toString() ||
    null;
  const categoryId =
    product.category_id?._id?.toString() ||
    product.category_id?.toString() ||
    null;

  // 🧱 Process each variant and compute best offer dynamically
  const variants = (product.variants || []).map((variant) => {
    const basePrice = Number(variant.price || 0);
    let bestOffer = null;
    let maxDiscount = 0;

    // 🔍 Find highest applicable offer for this product
    for (const offer of activeOffers) {
      const matchesProduct = offer.product?.some((id) => id?.toString() === productId);
      const matchesBrand = offer.brand?.some((id) => id?.toString() === brandId);
      const matchesCategory = offer.category?.some((id) => id?.toString() === categoryId);

      if (matchesProduct || matchesBrand || matchesCategory) {
        if (offer.discountPercentage > maxDiscount) {
          maxDiscount = offer.discountPercentage;
          bestOffer = offer;
        }
      }
    }

    // 🧮 Calculate final price using offer percentage
    const offerApplied = bestOffer ? true : false;
    const calculatedPrice = offerApplied
      ? Number((basePrice - basePrice * maxDiscount / 100).toFixed(2))
      : basePrice;

    return {
      ...variant,
      price: basePrice,                     // Keep original price
      calculated_price: calculatedPrice,    // ✅ Used everywhere instead of discounted_price
      offerPercent: offerApplied ? maxDiscount : 0,
      offerName: offerApplied ? bestOffer.offerName : null,
      is_active: variant.is_active !== false,
    };
  });

  return { ...product, variants };
}

module.exports = applyOffersToProduct;
