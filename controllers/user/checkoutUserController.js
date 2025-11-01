const asyncHandler = require('express-async-handler')
const messages = require('../../constants/messages')
const httpStatus = require('../../constants/httpStatus')
const Address = require('../../models/addressSchema')
const Cart = require('../../models/cartSchema')
const Order = require('../../models/orderSchema')
const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')


const loadCheckout = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    if(!userId) {
        return res.redirect('/auth/login')
    }

    const addresses = await Address.find({user_id:userId}).lean()

    const cart = await Cart.findOne({user_id:userId}).populate('items.product_id').lean()

    if(!cart || cart.items.length === 0) {
        return res.redirect('/cart')
    }
    let removedItems = false

    cart.items = cart.items.filter(item => {
        if(!item.product_id) return false

        const variant = item.product_id.variants.find(v => v._id.toString() === item.variant_id.toString())
        if (!variant || !variant.is_active) return false

        if(variant.stock < item.quantity) {
            removedItems = true
            return false
        }
        return true
    })

    if(removedItems) {
        await Cart.updateOne({_id:cart._id},{$set:{items:cart.items}})
        return res.redirect('/cart?error=stock')
    }

    let subtotal = 0, discount = 0, tax = 0, total = 0

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

    res.render('user/checkout',{layout:'layouts/user_main',addresses,cart,subtotal,discount,tax,total,cartLength:cart?.items?.length || 0,selectedId:req.query.selected || null,error:req.query.error || null})
})

const placeOrder = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    if(!userId) return res.redirect('/auth/login')

    const{addressIndex, paymentMethod} = req.body

    const addresses = await Address.find({user_id:userId}).lean()
    const selectedAddress = addresses[addressIndex]
    if(!selectedAddress) return res.redirect('/checkout?error=noAddress')

    const cart = await Cart.findOne({user_id:userId}).populate('items.product_id').lean()
    if(!cart || cart.items.length === 0) return res.redirect('/cart')

    let stockIssue =false
    let updatedItems = []
    let stockAdjustedProducts = []

    for(const item of cart.items) {
        const product = item.product_id
        if(!product) continue
        const variant = item.product_id?.variants.find((v) => v._id.toString() === item.variant_id.toString())
        if(!variant || !variant.is_active) {
            stockIssue = true
            continue
        }
        if(variant.stock === 0) {
            stockIssue =true
            continue
        }

        if(variant.stock < item.quantity) {
            stockIssue = true
            stockAdjustedProducts.push({
                name:product.title,requested:item.quantity,available:variant.stock,
            })
            
            updatedItems.push({
                ...item,quantity:variant.stock,
            })
        }else{
            updatedItems.push(item)
        }
    }

    await Cart.updateOne({_id:cart._id},{$set:{items:updatedItems}})

    if(updatedItems.length === 0) {
        return res.redirect('/cart?error=stock')
    }

    if(stockIssue) {
        const productList = stockAdjustedProducts.map((p) => `${p.name} (only ${p.available} left)`).join(', ')
        return res.redirect(`/cart?error=stockUpdate&products=${encodeURIComponent(productList)}`)
    }
    
    let subtotal = 0, discount = 0
    updatedItems.forEach(item => {
        const variant = item.product_id.variants.find(v => v._id.toString() === item.variant_id.toString())
        if(!variant) return 
        const price = variant.discounted_price || variant.price
        subtotal += price * item.quantity

        if(variant.discounted_price && variant.discounted_price < variant.price) {
            discount += (variant.price - variant.discounted_price) * item.quantity
        }
    })

    const tax = Number((subtotal * 0.02).toFixed(2))
    const total = subtotal + tax

    const orderItem = updatedItems.map((item) => {
        const variant = item.product_id.variants.find(v => v._id.toString() === item.variant_id.toString())
        return {
            product: item.product_id._id,
            variantId: variant._id,
            title: item.product_id.title,
            flavour: variant.flavour,
            size: variant.size,
            image: variant.images?.[0] || null,
            price: variant.discounted_price || variant.price,
            quantity: item.quantity,
            totalPrice: (variant.discounted_price || variant.price) * item.quantity,
            tax: Number(((variant.discounted_price || variant.price) * item.quantity * 0.02).toFixed(2)),
            discount: variant.discounted_price ? (variant.price - variant.discounted_price) * item.quantity : 0,
            offerApplied: 0
        }
    })

    const embeddedAddress = {fullname: selectedAddress.fullname,mobile: selectedAddress.mobile,address: selectedAddress.address,district: selectedAddress.district,state: selectedAddress.state,country: selectedAddress.country,pincode: selectedAddress.pincode}

    const order = await Order.create({
        user:userId,
        orderAddress:embeddedAddress,
        paymentMethod,
        subtotal,
        tax,
        couponDiscount:0,
        totalAmount:total,
        items:orderItem
    })

    for(const item of orderItem) {
        await Product.updateOne(
            {_id:item.product,'variants._id':item.variantId},{$inc:{'variants.$.stock':-item.quantity}}
        )
    }

    await Cart.findOneAndUpdate({user_id:userId},{$set:{items:[]}})
    res.redirect(`/checkout/order-success/${order._id}`)
})

const viewOrderSuccess = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    if(!userId) return res.redirect('/auth/login')
    
    const order = await Order.findById(req.params.id).populate('user','email').lean()
    if(!order) return res.redirect('/')
        
    res.render('user/orderSuccess',{layout:'layouts/user_main',order})
})

module.exports = {loadCheckout,placeOrder,viewOrderSuccess}
