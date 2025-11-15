const express = require('express')
const router = express.Router()
const {checkSession} = require('../../middlewares/checkSession')
const walletController = require('../../controllers/user/walletUserController')
const Wallet = require('../../models/walletSchema')

router.get('/',checkSession,walletController.loadWallet)
router.post('/add',checkSession,walletController.createRazorpayOrder)
router.post('/verify',checkSession,walletController.verifyRazorpayPayment)


module.exports = router