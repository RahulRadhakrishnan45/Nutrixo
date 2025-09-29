const asyncHandler = require('express-async-handler')
const messages = require('../../constants/messages')
const httpStatus = require('../../constants/httpStatus')
const Address = require('../../models/addressSchema')
const Cart = require('../../models/cartSchema')
const { text } = require('express')


const loadCheckout = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    if(!userId) {
        return res.redirect('/auth/login')
    }

    const addresses = await Address.find({user_id:userId}).lean()

    const cart = await Cart.findOne({user_id:userId}).populate('items.product_id').lean()

    let subtotal = 0
    let discount = 0
    let tax = 0
    let total = 0

    if(cart && cart.items.length > 0) {
        subtotal = cart.items.reduce((acc,item) => {
            const variant = item.product_id.variants.find((v) => v._id.toString() === item.variant_id.toString())
            
            if(!variant) return acc

            const price = variant.discounted_price || variant.price
            return acc + price * item.quantity
        },0)

        discount = cart.items.reduce((acc,item) => {
            const variant = item.product_id.variants.find((v) => v._id.toString() === item.variant_id.toString())

            if(!variant) return acc

            if(variant.discounted_price && variant.discounted_price < variant.price) {
                acc += (variant.price - variant.discounted_price) * item.quantity
            }
            return acc
        },0)

        tax = Number((subtotal * 0.02).toFixed(2))
        total = subtotal -discount + tax
    }

    res.render('user/checkout',{layout:'layouts/user_main',addresses,cart,subtotal,discount,tax,total,selectedId:req.query.selected || null})
})


module.exports = {loadCheckout}