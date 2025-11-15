const asyncHandler = require('express-async-handler')
const messages = require('../../constants/messages')
const httpStatus = require('../../constants/httpStatus')
const Address = require('../../models/addressSchema')
const Cart = require('../../models/cartSchema')
const Order = require('../../models/orderSchema')
const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const Coupon = require('../../models/couponSchema')
const Offer = require('../../models/offerSchema')
const Wallet = require('../../models/walletSchema')
const applyOffersToProduct = require('../../utils/applyOffer')
const createorderAndFinalize = require('../../utils/createOrder')
const razorpay = require('../../config/razorpay')
const crypto = require('crypto')


const loadCheckout = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    if(!userId) return res.redirect('/auth/login')

    const addresses = await Address.find({user_id:userId}).lean()
    const cart = await Cart.findOne({user_id:userId}).populate('items.product_id').lean()
    if(!cart || cart.items.length === 0) {
        req.session.coupon = null
        return res.redirect('/cart')
    }
    let removedItems = false
    const validItems = []

    for(const item of cart.items) {
        const product = item.product_id
        if(!product) continue

        const variant = product.variants.find(v => v._id.toString() === item.variant_id.toString())
        if(!variant || !variant.is_active || variant.stock < item.quantity) {
            removedItems = true
            continue
        }
        validItems.push(item)
    }

    if(removedItems) {
        await Cart.updateOne({_id:cart._id},{$set:{items:validItems}})
        return res.redirect('/cart?error=stock')
    }

    let actualPrice = 0, subtotalAfterOffer = 0, offerDiscount = 0, couponDiscount = 0, tax = 0, total = 0

    for(const item of validItems) {
        const product = await Product.findById(item.product_id._id).populate('brand_id').populate('category_id').lean()
        if(!product) continue

        const offeredProduct = await applyOffersToProduct(product)
        const variant = offeredProduct.variants.find(v => v._id.toString() === item.variant_id.toString())
        if(!variant) continue

        const basePrice = variant.price
        const offerPrice = variant.calculated_price

        actualPrice += basePrice * item.quantity
        offerDiscount += (basePrice - offerPrice) * item.quantity
    }

    subtotalAfterOffer = actualPrice - offerDiscount

    let appliedCoupon = null
    if(req.session.coupon) {
        const coupon = await Coupon.findOne({code:req.session.coupon.code,isActive:true})
        if(coupon && subtotalAfterOffer >= coupon.minimumPurchase && new Date() >= coupon.startDate && new Date() <= coupon.endDate) {
            if(subtotalAfterOffer >= coupon.minimumPurchase) {
                if(coupon.discountType === 'percentage') {
                    couponDiscount = Math.min((subtotalAfterOffer * coupon.discountAmount) / 100, subtotalAfterOffer)
                }else{
                    couponDiscount = Math.min(coupon.discountAmount, subtotalAfterOffer)
                }
                appliedCoupon = coupon
            }else{
                req.session.coupon = null
                couponDiscount = 0
            }
        }
    }

    const totalDiscount = offerDiscount + couponDiscount
    tax = Number(((subtotalAfterOffer - couponDiscount) * 0.02).toFixed(2))
    total = subtotalAfterOffer - couponDiscount + tax

    const wallet = await Wallet.findOne({user_id:userId}).lean()
    const walletBalance = wallet?.balance || 0

    const today = new Date()
    const coupons = await Coupon.find({isActive:true,startDate:{$lte:today},endDate:{$gte:today},}).lean()
    
    res.render('user/checkout',{layout:'layouts/user_main',walletBalance,addresses,coupons,cart:{...cart,items:validItems},actualPrice:actualPrice.toFixed(2),offerDiscount:offerDiscount.toFixed(2),subtotal:subtotalAfterOffer.toFixed(2),couponDiscount:couponDiscount.toFixed(2),totalDiscount:totalDiscount.toFixed(2),tax:tax.toFixed(2),total:total.toFixed(2),appliedCoupon,cartLength:validItems.length || 0,selectedId:req.query.selected || null,error:req.query.error || null})
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
        const variant = product.variants.find((v) => v._id.toString() === item.variant_id.toString())
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

    if(updatedItems.length === 0) return res.redirect('/cart?error=stock')
    
    if(stockIssue) {
        const productList = stockAdjustedProducts.map((p) => `${p.name} (only ${p.available} left)`).join(', ')
        return res.redirect(`/cart?error=stockUpdate&products=${encodeURIComponent(productList)}`)
    }
    
    let actualTotal = 0, offerDiscount = 0, couponDiscount = 0, subtotal = 0, tax = 0, total = 0

    const now = new Date()
    const activeOffers = await Offer.find({isActive:true,validFrom:{$lte:now},validTo:{$gte:now},}).lean()

    for(const item of updatedItems) {
        const product = await Product.findById(item.product_id._id).populate('brand_id').populate('category_id').lean()

        const offeredProduct = await applyOffersToProduct(product,activeOffers)
        const variant = offeredProduct.variants.find(v => v._id.toString() === item.variant_id.toString())
        if(!variant) continue

        const base = Number(variant.price)
        const offerPrice = Number(variant.calculated_price)

        actualTotal += base * item.quantity
        offerDiscount += (base - offerPrice) * item.quantity
    }

    subtotal = actualTotal - offerDiscount

    let appliedCoupon = null
    if(req.session.coupon) {
        const coupon = await Coupon.findOne({code:req.session.coupon.code,isActive:true})
        if(coupon && subtotal >= coupon.minimumPurchase) {
            if(coupon.discountType === 'percentage') {
                couponDiscount = Math.min((subtotal * coupon.discountAmount) / 100, subtotal)
            }else{
                couponDiscount = Math.min(coupon.discountAmount, subtotal)
            }
            appliedCoupon = coupon
        }else{
            req.session.coupon = null
        }
    }

    const totalDiscount = offerDiscount + couponDiscount
    tax = Number(((subtotal - couponDiscount) * 0.02).toFixed(2))
    total = subtotal - couponDiscount + tax

    if(paymentMethod === 'WALLET') {
        const wallet = await Wallet.findOne({user_id:userId})
        if(!wallet || wallet.balance < total) return res.redirect('/checkout?error=insufficientWallet')
        
        wallet.balance -= total
        
        wallet.transactions.push({
            amount:total,type:'DEBIT',description:'Order payment'
        })

        await wallet.save()

        const order = await createorderAndFinalize.createOrderAndFinalize({
            userId,
            selectedAddress,
            paymentMethod: "WALLET",
            paymentStatus: "COMPLETED",
            updatedItems,
            appliedCoupon,
            activeOffers,
            subtotal,
            couponDiscount,
            tax,
            total,
        })

        return res.redirect(`/checkout/${order._id}/success`)
    }

    if(paymentMethod === 'COD') {
        const order = await createorderAndFinalize({
            userId,
            selectedAddress,
            paymentMethod: "COD",
            paymentStatus: "PENDING",
            updatedItems,
            appliedCoupon,
            activeOffers,
            subtotal,
            couponDiscount,
            tax,
            total,
        })

        return res.redirect(`/checkout/${order._id}/success`)
    }

    if(paymentMethod === 'CARD') {
        const razorOrder = await razorpay.orders.create({
            amount:total * 100, currency:'INR',receipt:'order_' + Date.now()
        })

        return res.render('user/razorpayPage',{layout:'layouts/user_main',razorOrder,total,addressIndex,key_id:process.env.RAZORPAY_KEY_ID,})
    }
})

const verifyRazorpay = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    const {razorpay_order_id, razorpay_payment_id, razorpay_signature,total,addressIndex} = req.body

    const body = razorpay_order_id + '|' + razorpay_payment_id

    const expectSign = crypto.createHmac('sha256',process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex')
    if(expectSign !== razorpay_signature) {
        return res.render('user/orderFail')
    }

    const addresses = await Address.find({ user_id: userId }).lean()
    const selectedAddress = addresses[addressIndex]

    const cart = await Cart.findOne({user_id:userId}).populate('items.product_id').lean()
    const now = new Date()
    const activeOffers = await Offer.find({isActive:true,validFrom:{$lte:now},validTo:{$gte:now},}).lean()

    const updatedItems = cart.items

    const order = await createorderAndFinalize.createOrderAndFinalize({
        userId,
        selectedAddress,
        paymentMethod: "CARD",
        paymentStatus: "COMPLETED",
        updatedItems,
        appliedCoupon: null,
        activeOffers,
        subtotal: 0,
        couponDiscount: 0,
        tax: 0,
        total,
    })

    return res.json({success:true,orderId:order._id})
})

const viewOrderSuccess = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    if(!userId) return res.redirect('/auth/login')
    
    const order = await Order.findById(req.params.id).populate('user','email').lean()
    if(!order) return res.redirect('/')
        
    res.render('user/orderSuccess',{layout:'layouts/user_main',order})
})

module.exports = {loadCheckout,placeOrder,viewOrderSuccess,verifyRazorpay}
