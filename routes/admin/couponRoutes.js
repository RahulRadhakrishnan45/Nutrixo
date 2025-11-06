const express = require('express')
const router = express.Router()
const couponController = require('../../controllers/admin/couponAdminController')
const {checkAdminSession} = require('../../middlewares/checkSession')


router.get('/',checkAdminSession,couponController.loadCoupon)
router.post('/',checkAdminSession,couponController.createCoupon)
router.get('/new',checkAdminSession,couponController.loadAddCoupon)
router.put('/:id',checkAdminSession,couponController.updateCoupon)
router.delete('/:id',checkAdminSession,couponController.deleteCoupon)
router.patch('/:id',checkAdminSession,couponController.updateCouponStatus)


module.exports = router