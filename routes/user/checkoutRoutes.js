const express = require('express')
const router = express.Router()
const { checkSession } = require('../../middlewares/checkSession')
const checkoutController = require('../../controllers/user/checkoutUserController')

router.get('/', checkSession, checkoutController.loadCheckout)
router.post('/place-order', checkSession, checkoutController.placeOrder)
router.get('/order-success/:id', checkSession, checkoutController.viewOrderSuccess)
router.get('/orders', checkSession, checkoutController.loadOrders)
router.get('/orders/:orderId', checkSession, checkoutController.loadOrderTracking)
router.post('/orders/:orderId/item/:itemId/cancel', checkSession, checkoutController.cancelOrder)

module.exports = router
