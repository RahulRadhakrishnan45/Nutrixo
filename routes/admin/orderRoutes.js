const express = require('express')
const router = express.Router()
const orderController = require('../../controllers/admin/orderAdminController')
const { checkAdminSession} = require('../../middlewares/checkSession')

router.get('/',checkAdminSession,orderController.loadOrders)
router.get('/:orderId',checkAdminSession,orderController.loadOrderDetails)
router.post('/:orderId/items/:itemId/status',checkAdminSession,orderController.updateItemStatus)
router.post('/:orderId/items/:itemId/cancellation/approve',checkAdminSession,orderController.approveCancellation)
router.post('/:orderId/items/:itemId/cancellation/reject',checkAdminSession,orderController.rejectCancellation)
router.post('/:orderId/items/:itemId/return/approve',checkAdminSession,orderController.approveReturn)
router.post('/:orderId/items/:itemId/return/reject',checkAdminSession,orderController.rejectReturn)

module.exports = router