const express = require('express')
const router = express.Router()

router.use('/', require('./authRoutes'))
router.use('/category', require('./categoryRoutes'))
router.use('/brands', require('./brandRoutes'))
router.use('/products', require('./productRoutes'))
router.use('/customers', require('./userRoutes'))
router.use('/orders', require('./orderRoutes'))
router.use('/coupons', require('./couponRoutes'))
router.use('/offers', require('./offerRoutes'))
router.use('/salesreport', require('./reportRoutes'))

module.exports = router
