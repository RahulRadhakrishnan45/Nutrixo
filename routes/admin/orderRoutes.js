const express = require('express')
const router = express.Router()
const orderController = require('../../controllers/admin/orderAdminController')
const { checkAdminSession} = require('../../middlewares/checkSession')

router.get('/',checkAdminSession,orderController.loadOrders)

module.exports = router