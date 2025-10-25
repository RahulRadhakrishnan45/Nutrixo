const express = require('express')
const router = express.Router()

router.use('/', require('./authRoutes'))
router.use('/category', require('./categoryRoutes'))
router.use('/brands', require('./brandRoutes'))
router.use('/products', require('./productRoutes'))
router.use('/customers', require('./userRoutes'))

module.exports = router
