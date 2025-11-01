const express = require('express')
const router = express.Router()
const { checkSession } = require('../../middlewares/checkSession')
const checkoutController = require('../../controllers/user/checkoutUserController')

router.get('/', checkSession, checkoutController.loadCheckout)
router.post('/place-order', checkSession, checkoutController.placeOrder)
router.get('/order-success/:id', checkSession, checkoutController.viewOrderSuccess)

module.exports = router
