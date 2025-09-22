const asyncHandler = require('express-async-handler')
const Product = require('../../models/productSchema')
const Cart = require('../../models/cartSchema')
const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')



const addToCart = asyncHandler( async( req,res) => {
    const {productId, variantId, quantity} = req.body
    const userId = req.session.user._id

    if(!userId) {
        return res.status(httpStatus.unauthorized).json({message:messages.CART.CART_ADD_FAILED})
    }

    const qty = parseInt(quantity,10)
    if(!productId || !variantId || isNaN(qty) || qty <= 0) {
        return res.status(httpStatus.bad_request).json({message:messages.AUTH.INVALID_REQUEST})
    }

    const product = await Product.findById(productId)
    if(!product) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.PRODUCT.PRODUCT_NOT_FOUND})
    }

    const variant = product.variants.id(variantId)
    if(!variant) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.VARIANT.VARIANT_NOT_FOUND})
    }

    if(variant.stock < qty) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.STOCK.OUT_OF_STOCK})
    }

    let cart = await Cart.findOne({user_id:userId})
    if(!cart) {
        cart = new Cart({user_id:userId,items:[]})
    }

    const existingItem = cart.items.find((item) => item.product_id?.toString() === productId.toString() && item.variant_id?.toString() === variantId.toString())

    if(existingItem) {
        if(existingItem.quantity + qty > variant.stock) {
            return res.status(httpStatus.bad_request).json({success:false,message:messages.STOCK.OUT_OF_STOCK})
        }
        existingItem.quantity += qty
    }else{
        cart.items.push({
            product_id:product._id,
            variant_id:variant._id,
            flavour:variant.flavour,
            size:variant.size,
            quantity:qty,
            price:variant.discounted_price || variant.price
        })
    }

    await cart.save()
    res.status(httpStatus.ok).json({success:true,message:messages.CART.CART_ADD,cart})
})

const loadCart = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    
    let cart = await Cart.findOne({user_id:userId}).lean()

    if(!cart || cart.items.length === 0) {
        return res.render('user/cart',{layout:'layouts/user_main',cartItems:[],subtotal:0,tax:0,total:0})
    }

    const cartItems = []
    let subtotal = 0

    for(const item of cart.items) {
        const product = await Product.findById(item.product_id).lean()
        if(!product) continue

        const variant = product.variants.find(v => v._id.toString() === item.variant_id.toString())
        if(!variant) continue

        const price = variant.discounted_price || variant.price
        const itemSubtotal = price * item.quantity
        subtotal += itemSubtotal

        cartItems.push({
            _id:item._id,
            product,
            variant,
            quantity:item.quantity,
            subtotal:itemSubtotal,
        })
    }

    const tax = Math.round(subtotal * 0.02)
    const total = subtotal + tax
    
    res.render('user/cart',{layout:'layouts/user_main',cartItems,subtotal,tax,total})
})

const increaseQty = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    const itemId = req.params.id

    let cart = await Cart.findOne({user_id:userId})
    if(!cart) return res.json({success:false,message:messages.CART.CART_NOT_FOUND})

    const item = cart.items.id(itemId)
    if(!item) return res.json({success:false,message:messages.PRODUCT.PRODUCT_NOT_FOUND})

    const product = await Product.findById(item.product_id)
    if(!product) return res.json({success:false,message:messages.PRODUCT.PRODUCT_NOT_FOUND})

    const variant = product.variants.id(item.variant_id)
    if(!variant) return res.json({success:false,message:messages.VARIANT.VARIANT_NOT_FOUND})

    if(item.quantity >= 5) {
        return res.json({success:false,message:messages.STOCK.STOCK_ALLOWED})
    }

    item.quantity += 1
    await cart.save()

    const summary = calculateSummary(cart)
    res.json({success:true, newQty:item.quantity, summary,message:'Quantity updated successfully'})
        
})

const decreaseQty = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    const itemId = req.params.id

    let cart = await Cart.findOne({user_id:userId})
    if(!cart) return res.json({success:false,message:messages.CART.CART_NOT_FOUND})

    const item = cart.items.id(itemId)
    if(!item) return res.json({success:false,message:messages.PRODUCT.PRODUCT_NOT_FOUND})

    item.quantity -= 1
    let removed = false

    if(item.quantity <= 0) {
        cart.items.pull(itemId)
        removed = true
    }

    await cart.save()

    const summary = calculateSummary(cart)
    res.json({success:true,newQty:item.quantity,removed,summary,message:'Quantity updated successfully'})
})

const removeItem = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    const itemId = req.params.id

    let cart = await Cart.findOne({user_id:userId})
    if(!cart) return res.json({success:false,message:messages.CART.CART_NOT_FOUND})

    const item = cart.items.id(itemId)
    if(!item) return res.json({success:false,message:messages.PRODUCT.PRODUCT_NOT_FOUND})
    
    cart.items.pull(itemId)
    await cart.save()

    const summary = calculateSummary(cart)
    res.json({success:true,removed:true,summary})
})

function calculateSummary(cart) {
  let subtotal = 0
  cart.items.forEach(i => subtotal += i.price * i.quantity)
  const tax = Math.round(subtotal * 0.02)
  const total = subtotal + tax
  return { subtotal, tax, total }
}



module.exports = {addToCart,loadCart,increaseQty,decreaseQty,removeItem}
