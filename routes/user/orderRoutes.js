const express = require('express')
const router = express.Router()
const { checkSession } = require('../../middlewares/checkSession')
const checkoutController = require('../../controllers/user/checkoutUserController')

router.get('/', checkSession, checkoutController.loadOrders)
router.get('/:orderId', checkSession, checkoutController.loadOrderTracking)
router.post('/:orderId/item/:itemId/cancel', checkSession, checkoutController.cancelOrder)

module.exports = router
