const asyncHandler = require('express-async-handler')
const messages = require('../../constants/messages')
const httpStatus = require('../../constants/httpStatus')
const Address = require('../../models/addressSchema')
const Cart = require('../../models/cartSchema')
const Order = require('../../models/orderSchema')
const User = require('../../models/userSchema')
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
        cart.items = cart.items.filter(item => {
            if(!item.product_id) return false

            const variant = item.product_id.variants.find(v => v._id.toString() === item.variant_id.toString())
            if(!variant) return false

            return variant.is_active !== false && variant.stock >= item.quantity
        })
        await Cart.updateOne({_id:cart._id},{$set:{items:cart.items}})
    }

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
        total = subtotal + tax
    }

    res.render('user/checkout',{layout:'layouts/user_main',addresses,cart,subtotal,discount,tax,total,cartLength:cart?.items?.length || 0,selectedId:req.query.selected || null})
})

const placeOrder = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    if(!userId) return res.redirect('/auth/login')

    const{addressIndex, paymentMethod} = req.body

    const addresses = await Address.find({user_id:userId}).lean()
    const selectedAddress = addresses[addressIndex]
    if(!selectedAddress) return res.redirect('/checkout')

    const cart = await Cart.findOne({user_id:userId}).populate('items.product_id').lean()
    if(!cart || cart.items.length === 0) return res.redirect('/cart')

    let subtotal = 0, discount = 0
    subtotal = cart.items.reduce((acc,item) => {
        const variant = item.product_id.variants.find(v => v._id.toString() === item.variant_id.toString())
        if(!variant) return acc
        const price = variant.discounted_price || variant.price
        return acc + price * item.quantity 
    },0)

    const tax = Number((subtotal * 0.02).toFixed(2))
    const total = subtotal + tax

    const order = await Order.create({
        user:userId,
        orderAddress:selectedAddress._id,
        paymentMethod,
        subtotal,
        tax,
        couponDiscount:0,
        totalAmount:total,
        items:[]
    })

    await Cart.findOneAndUpdate({user_id:userId},{$set:{items:[]}})
    res.redirect(`/order-success/${order._id}`)
})

const viewOrderSuccess = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    if(!userId) return res.redirect('/auth/login')
    
    const order = await Order.findById(req.params.id).populate('user','email').lean()
    if(!order) return res.redirect('/')
        
    res.render('user/orderSuccess',{layout:'layouts/user_main',order})
})


module.exports = {loadCheckout,placeOrder,viewOrderSuccess}