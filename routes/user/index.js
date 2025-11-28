const express = require('express')
const router = express.Router()

router.use('/auth', require('./authRoutes'))
router.use('/', require('./productRoutes'))
router.use('/cart', require('./cartRoutes'))
router.use('/profile', require('./profileRoutes'))
router.use('/checkout', require('./checkoutRoutes'))
router.use('/orders', require('./orderRoutes'))
router.use('/password', require('./passwordRoutes'))
router.use('/wishlist',require('./wishlistRoutes'))
router.use('/coupons', require('./couponRoutes'))
router.use('/wallet', require('./walletRoutes'))
router.use('/refer', require('./referralRoutes'))

module.exports = router
