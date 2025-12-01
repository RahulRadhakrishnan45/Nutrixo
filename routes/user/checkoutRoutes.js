const express = require('express')
const router = express.Router()
const { checkSession } = require('../../middlewares/checkSession')
const checkoutController = require('../../controllers/user/checkoutUserController')

router.get('/', checkSession, checkoutController.loadCheckout)
router.post('/orders', checkSession, checkoutController.placeOrder)
router.get('/order/:orderId/check-stock', checkSession, checkoutController.retryCheckStock)
router.get('/order/:orderId/retry-payment', checkSession, checkoutController.retryPaymentDirect)
router.get('/retry/:orderId', checkSession, checkoutController.retryPayment)
router.get('/:orderId/fail', checkSession, checkoutController.viewOrderFail)
router.get('/:id/success', checkSession, checkoutController.viewOrderSuccess)
router.post('/verify', checkSession, checkoutController.verifyRazorpay)


module.exports = router
