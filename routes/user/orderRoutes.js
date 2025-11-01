const express = require('express')
const router = express.Router()
const { checkSession } = require('../../middlewares/checkSession')
const orderController = require('../../controllers/user/orderUserController')

router.get('/', checkSession, orderController.loadOrders)
router.get('/:orderId', checkSession, orderController.loadOrderTracking)
router.post('/:orderId/item/:itemId/cancel', checkSession, orderController.cancelSingleOrder)
router.post('/:orderId/cancel',checkSession,orderController.cancelEntireOrder)
router.get('/:orderId/invoice',checkSession,orderController.downloadInvoice)
router.post('/:orderId/item/:itemId/return',checkSession,orderController.returnSingleOrder)
router.post('/:orderId/return',checkSession,orderController.returnEntireOrder)


module.exports = router
