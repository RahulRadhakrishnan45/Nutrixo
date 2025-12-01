const Category = require('../models/categorySchema');
const Brand = require('../models/brandSchema');
const Cart = require('../models/cartSchema');
const Wishlist = require('../models/wishlistSchema'); // ✅ import wishlist

async function headerData(req, res, next) {
  try {
    
    const categories = await Category.find({ is_active: true, is_deleted: false }).select('name -_id')
    res.locals.categories = categories.length ? categories.map(c => c.name) : []

    const brands = await Brand.find({ is_active: true, is_delete: false }).select('name -_id')
    res.locals.brands = brands.length ? brands.map(b => b.name) : []

    if (req.session.user?._id) {
      const userId = req.session.user._id

      const cart = await Cart.findOne({ user_id: userId }).lean()
      const cartCount = cart ? cart.items.reduce((sum, i) => sum + i.quantity, 0) : 0
      res.locals.cartLength = cartCount > 5 ? '5+' : cartCount

      const wishlist = await Wishlist.findOne({ user_id: userId }).lean()
      const wishlistLength = wishlist ? wishlist.items.length : 0
      res.locals.wishlistLength = wishlistLength
    } else {
      res.locals.cartLength = 0
      res.locals.wishlistLength = 0
    }

    next()
  } catch (error) {
    console.error('HeaderData middleware error:', error)
    res.locals.categories = []
    res.locals.brands = []
    res.locals.cartLength = 0
    res.locals.wishlistLength = 0
    next()
  }
}

module.exports = headerData
