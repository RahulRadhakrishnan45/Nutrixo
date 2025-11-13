const asyncHandler = require('express-async-handler')
const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')
const Coupon = require('../../models/couponSchema')
const Cart = require('../../models/cartSchema')
const Product = require('../../models/productSchema')


const applyCoupon = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    if(!userId) return res.redirect('/auth/login')

    const {code} = req.body
    const coupon = await Coupon.findOne({code:code.toUpperCase(),isActive:true})
    if(!coupon) return res.redirect('/checkout?error=invalidCoupon')

    const cart = await Cart.findOne({user_id:userId}).populate('items.product_id').lean()
    if(!cart) return res.redirect('/cart')
    
    let subtotal = 0
    for(const item of cart.items) {
        const product = await Product.findById(item.product_id._id).lean()
        if(!product) continue
        const variant = product.variants.find(v => v._id.toString() === item.variant_id.toString())
        if(!variant) continue
        subtotal += variant.price * item.quantity
    }

    if(subtotal < coupon.minimumPurchase) {
        return res.redirect('/checkout?error=minimumNotMet')
    }

    let discountAmount = 0
    if(coupon.discountType === 'percentage') {
        discountAmount = Math.min((subtotal * coupon.discountAmount) / 100, subtotal)
    }else{
        discountAmount = Math.min(coupon.discountAmount, subtotal)
    }

    req.session.coupon = {
        code:coupon.code,
        discountAmount:discountAmount,
    }

    res.redirect('/checkout')
})

const removeCoupon = asyncHandler( async( req,res) => {
    if(req.session.coupon) {
        delete req.session.coupon
    }
    res.redirect('/checkout')
})


module.exports = {applyCoupon,removeCoupon}
