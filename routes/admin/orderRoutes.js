const express = require('express')
const router = express.Router()
const orderController = require('../../controllers/admin/orderAdminController')
const { checkAdminSession} = require('../../middlewares/checkSession')

router.get('/',checkAdminSession,orderController.loadOrders)
router.get('/:orderId',checkAdminSession,orderController.loadOrderDetails)
router.patch('/:orderId/items/:itemId/status',checkAdminSession,orderController.updateItemStatus)
router.patch('/:orderId/items/:itemId/cancellation/approve',checkAdminSession,orderController.approveCancellation)
router.patch('/:orderId/items/:itemId/cancellation/reject',checkAdminSession,orderController.rejectCancellation)
router.patch('/:orderId/items/:itemId/return/approve',checkAdminSession,orderController.approveReturn)
router.patch('/:orderId/items/:itemId/return/reject',checkAdminSession,orderController.rejectReturn)

module.exports = router
