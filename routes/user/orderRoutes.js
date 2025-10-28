const express = require('express')
const router = express.Router()
const { checkSession } = require('../../middlewares/checkSession')
const orderController = require('../../controllers/user/orderUserController')

router.get('/', checkSession, orderController.loadOrders)
router.get('/:orderId', checkSession, orderController.loadOrderTracking)
router.post('/:orderId/item/:itemId/cancel', checkSession, orderController.cancelSingleOrder)
router.get('/:orderId/invoice',checkSession,orderController.downloadInvoice)
router.post('/:orderId/cancel',checkSession,orderController.cancelEntireOrder)

module.exports = router
