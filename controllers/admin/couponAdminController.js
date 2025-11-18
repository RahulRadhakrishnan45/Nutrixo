const Coupon = require('../../models/couponSchema')
const asyncHandler = require('express-async-handler')
const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')
const { http } = require('winston')

const loadCoupon = asyncHandler( async( req,res) => {
    const page = parseInt(req.query.page) || 1
    const limit = 5
    const skip = (page - 1) * limit

    const totalCoupons = await Coupon.countDocuments()
    const coupons = await Coupon.find().sort({createdAt:-1}).skip(skip).limit(limit)
    const totalPages = Math.ceil(totalCoupons / limit)

    res.render('admin/coupon',{layout:'layouts/admin_main',coupons,currentPage:page,totalPages,query:req.query || {}})
})

const loadAddCoupon = asyncHandler( async( req,res) => {
    res.render('admin/addCoupon',{layout:'layouts/admin_main'})
})

const createCoupon = asyncHandler( async( req,res) => {
    const {code,description,usageLimit,isActive,discountType,discountAmount,minimumPurchase,startDate,endDate} = req.body

    if(!code || !description || !discountType || !discountAmount || !startDate || !endDate) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.AUTH.ALL_FIELDS_REQUIRED})
    }

    const discountValue = Number(discountAmount)
    const minimumPurchaseValue = Number(minimumPurchase) || 0

    if(discountType === 'percentage' && (discountValue <= 0 || discountValue > 90)) {
        res.status(httpStatus.bad_request).json({success:false,message:messages.DISCOUNT.DISCOUNT_RANGE_LIMIT_EXCEED})
    }
    if(discountType === 'fixed' && discountValue > 10000) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.DISCOUNT.DISCOUNT_FIXED_LIMIT_EXCEED})
    }

    const existingCoupon = await Coupon.findOne({code:code.trim().toUpperCase()})
    if(existingCoupon) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.COUPON.COUPON_EXISTS})
    }

    const coupon = new Coupon({
        code:code.trim().toUpperCase(),
        description,
        usageLimit: usageLimit || null,
        isActive:isActive === 'on',
        discountType,
        discountAmount,
        minimumPurchase:minimumPurchase || 0,
        startDate,
        endDate
    })

    await coupon.save()
    return res.status(httpStatus.ok).json({success:true,message:messages.COUPON.COUPON_CREATED})
})

const updateCoupon = asyncHandler( async( req,res) => {
    const couponId = req.params.id
    const {code,description,usageLimit,discountType,discountAmount,minimumPurchase,startDate,endDate,isActive} = req.body

    if(!code || !description || !discountType || !discountAmount || !startDate || !endDate) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.AUTH.ALL_FIELDS_REQUIRED})
    }

    const existing = await Coupon.findOne({code:code.trim().toUpperCase(),_id:{$ne:couponId}})
    if(existing) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.COUPON.COUPON_EXISTS})
    }

    const discountValue = Number(discountAmount)
    const minimumPurchaseValue = Number(minimumPurchase) || 0

    if(discountType === 'percentage' && (discountValue <= 0 || discountValue > 90)) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.DISCOUNT.DISCOUNT_RANGE_LIMIT_EXCEED})
    }

    if(discountType === 'fixed' && minimumPurchase > 0 && discountValue >= minimumPurchaseValue) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.DISCOUNT.DICOUNT_CANNOT_EQUALS_MINIMUM_PURCHASE})
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if(start > end) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.DATE.DATE_INVALID})
    }

    const updated = await Coupon.findByIdAndUpdate(couponId, {
        code:code.trim().toUpperCase(),
        description,
        usageLimit:usageLimit || null,
        discountType,
        discountAmount,
        minimumPurchase:minimumPurchase || 0,
        startDate,
        endDate,
        isActive:isActive ==='on' || isActive ==='true'
    },{new:true})

    if(!updated) return res.status(httpStatus.not_found).json({success:false,message:messages.COUPON.COUPON_NOT_FOUND})

    res.json({success:true,message:messages.COUPON.COUPON_UPDATED})
})

const deleteCoupon = asyncHandler( async( req,res) => {
    const couponId = req.params.id
    const deleteCoupon = await Coupon.findByIdAndDelete(couponId)

    if(!deleteCoupon) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.COUPON.COUPON_NOT_FOUND})
    }

    return res.status(httpStatus.ok).json({success:true,message:messages.COUPON.COUPON_DELETED})
})

const updateCouponStatus = asyncHandler( async( req,res) => {
    const couponId = req.params.id
    const {isActive} = req.body

    const coupon = await Coupon.findById(couponId)
    if(!coupon) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.COUPON.COUPON_NOT_FOUND})
    }

    coupon.isActive = isActive
    await coupon.save()

    return res.status(httpStatus.ok).json({success:true,message:`Coupon has been ${isActive ? 'activated' : 'deactivated'} successfully`})
})

module.exports = {loadCoupon,loadAddCoupon,createCoupon,updateCoupon,deleteCoupon,updateCouponStatus}
