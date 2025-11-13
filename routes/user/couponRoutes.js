const express = require('express')
const router = express.Router()
const {checkSession} = require('../../middlewares/checkSession')
const couponController = require('../../controllers/user/couponUserController')


router.post('/apply',checkSession,couponController.applyCoupon)
router.post('/remove',checkSession,couponController.removeCoupon)


module.exports = router