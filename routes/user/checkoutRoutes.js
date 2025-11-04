const express = require('express')
const router = express.Router()
const { checkSession } = require('../../middlewares/checkSession')
const checkoutController = require('../../controllers/user/checkoutUserController')

router.get('/', checkSession, checkoutController.loadCheckout)
router.post('/orders', checkSession, checkoutController.placeOrder)
router.get('/:id/success', checkSession, checkoutController.viewOrderSuccess)

module.exports = router
