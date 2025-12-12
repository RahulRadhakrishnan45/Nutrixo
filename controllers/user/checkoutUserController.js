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
const finalizeOrder = require('../../utils/finalizeOrder')
const razorpay = require('../../config/razorpay')
const crypto = require('crypto')
const mongoose = require('mongoose')


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
    
    const isRetry = req.query.retry ==='1'
    const lastFailedOrderId = req.session.lastFailedOrderId || null

    res.render('user/checkout',{layout:'layouts/user_main',walletBalance,addresses,coupons,cart:{...cart,items:validItems},actualPrice:actualPrice.toFixed(2),offerDiscount:offerDiscount.toFixed(2),subtotal:subtotalAfterOffer.toFixed(2),couponDiscount:couponDiscount.toFixed(2),totalDiscount:totalDiscount.toFixed(2),tax:tax.toFixed(2),total:total.toFixed(2),appliedCoupon,cartLength:validItems.length || 0,selectedId:req.query.selected || null,error:req.query.error || null,retry:isRetry,retryOrderId:lastFailedOrderId})
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
        const product = await Product.findById(item.product_id)
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
        if (subtotal < coupon.minimumPurchase) {
            req.session.coupon = null;
            return res.redirect('/checkout?error=minimumNotMet')
        }
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

    if(paymentMethod === 'COD' && total > 1000) {
        return res.redirect('/checkout?error=codLimit')
    }

    const orderItems = await Promise.all(updatedItems.map(async (it) => {
        const product = await Product.findById(it.product_id._id).populate('brand_id').populate('category_id').lean();

        const offeredProduct = await applyOffersToProduct(product, activeOffers);

        const offeredVariant = offeredProduct.variants.find((v) => v._id.toString() === it.variant_id.toString())

        const baseVariant = it.product_id.variants.find((v) => v._id.toString() === it.variant_id.toString())

        const actualPrice = Number(baseVariant.price);
        const offerPrice = Number(offeredVariant.calculated_price);

        const qty = it.quantity;
        const totalPrice = offerPrice * qty;

        return {
            product: it.product_id._id,
            variantId: it.variant_id,
            title: it.product_id.title,
            flavour: baseVariant.flavour || null,
            size: baseVariant.size || null,
            image: baseVariant.images?.[0] || null,
            actualPrice,
            offerPrice,   
            price: offerPrice,
            quantity: qty,
            totalPrice,
            tax: Number((offerPrice * 0.02).toFixed(2)),
            discount: actualPrice - offerPrice,
            offerApplied: actualPrice - offerPrice,
            status: "PROCESSING",
            previousStatus: null,
            statusHistory: [
                { status: "PROCESSING", note: "Order Created" }
            ],
        }
    }))

    const pendingOrder = new Order({
        user: userId,
        items: orderItems,
        orderAddress: {
            fullname: selectedAddress.fullname,
            mobile: selectedAddress.mobile,
            address: selectedAddress.address,
            district: selectedAddress.district,
            state: selectedAddress.state,
            country: selectedAddress.country,
            pincode: selectedAddress.pincode,
        },
        paymentMethod,
        paymentStatus:'PENDING',
        showInOrders:false,
        actualTotal,
        offerDiscount,
        totalDiscount,
        subtotal,
        couponDiscount,
        tax,
        totalAmount: total,
        orderStatus: paymentMethod === 'COD' ? 'PLACED' : 'PENDING PAYMENT',
        coupon: appliedCoupon?._id || null,
    })

    await pendingOrder.save()

    if(paymentMethod === 'WALLET') {
        try {
            await finalizeOrder({orderId:pendingOrder._id,userId,paymentMethod:'WALLET',paymentDetails:{method:'WALLET'}})
            await Order.findByIdAndUpdate(pendingOrder._id,{showInOrders:true})
            req.session.coupon = null
            return res.redirect(`/checkout/${pendingOrder._id}/success`)     
        } catch (err) {
            console.error('Wallet finalize error', err)
            await Order.findByIdAndUpdate(pendingOrder._id, { paymentStatus: 'FAILED', orderStatus: 'PAYMENT FAILED' })
            return res.redirect('/checkout?error=wallet')
        }
    }

    if(paymentMethod === 'COD') {
        try {
            await finalizeOrder({ orderId: pendingOrder._id, userId, paymentMethod: 'COD', paymentDetails: { method: 'COD' } })
            await Order.findByIdAndUpdate(pendingOrder._id,{showInOrders:true})
            req.session.coupon = null
            return res.redirect(`/checkout/${pendingOrder._id}/success`)
        } catch (err) {
            console.error('COD finalize error', err)
            await Order.findByIdAndUpdate(pendingOrder._id, { paymentStatus: 'FAILED', orderStatus: 'PAYMENT FAILED' })
            return res.redirect('/checkout?error=cod')
        }
    }

    try {
        const razorOrder = await razorpay.orders.create({
        amount: Math.round(total * 100),
        currency: 'INR',
        receipt: pendingOrder._id.toString(),
        })

        pendingOrder.razorpayOrderId = razorOrder.id
        await pendingOrder.save()

        return res.render('user/razorpayPage', { layout: 'layouts/userLogin',razorOrder,total,addressIndex,key_id: process.env.RAZORPAY_KEY_ID,retry: false,orderId: pendingOrder._id,})
    } catch (err) {
        console.error('Razorpay order create error', err)
        await Order.findByIdAndUpdate(pendingOrder._id, { paymentStatus: 'FAILED', orderStatus: 'PAYMENT FAILED',showInOrders:false })
        return res.redirect('/checkout?error=payment')
    }
})

const verifyRazorpay = asyncHandler(async (req, res) => {
    const userId = req.session.user._id;
    const {razorpay_order_id,razorpay_payment_id,razorpay_signature,orderId,retryOrderId} = req.body

    const body = razorpay_order_id + "|" + razorpay_payment_id

    const expectSign = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body).digest("hex")

    if (expectSign !== razorpay_signature) {
        if (orderId) {
            await Order.findByIdAndUpdate(orderId, {paymentStatus: "FAILED",orderStatus: "PAYMENT FAILED",showInOrders:false})
            req.session.lastFailedOrderId = orderId
        }
        return res.json({success: false,message: messages.AUTH.INVALID_SIGN})
    }

    const targetOrder = retryOrderId ? await Order.findById(retryOrderId) : await Order.findById(orderId)

    if (!targetOrder) {
        return res.json({success: false,message: messages.ORDER.ORDER_NOT_FOUND});
    }

    await Order.findByIdAndUpdate(targetOrder._id, {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id
    });

    try {
        await finalizeOrder({
            orderId: targetOrder._id,
            userId,
            paymentMethod: "CARD",
            paymentDetails: {transactionId: razorpay_payment_id,paidAt: new Date() }
        })

        await Order.findByIdAndUpdate(targetOrder._id, {showInOrders:true})

        req.session.coupon = null
        req.session.lastFailedOrderId = null

        return res.json({success: true,orderId: targetOrder._id})

    } catch (err) {
        console.error("Finalize after verify failed", err);
        await Order.findByIdAndUpdate(targetOrder._id, {paymentStatus: "FAILED", orderStatus: "PAYMENT FAILED",showInOrders:false})

        req.session.lastFailedOrderId = targetOrder._id;

        return res.json({success: false, message: "Failed to finalize order after payment"})
    }
})

const retryCheckStock = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    const orderId = req.params.orderId

    const order = await Order.findOne({_id:orderId,user:userId})
    if(!order) {
        return res.json({success:false,message:messages.ORDER.ORDER_NOT_FOUND})
    }

    for(const item of order.items) {
        const product = await Product.findById(item.product)
        if(!product) {
            return res.json({success:false,message:messages.PRODUCT.PRODUCT_UNAVAILABLE})
        }
        
        const variant = product.variants.id(item.variantId)
        if(!variant || !variant.is_active) {
            return res.json({success:false,message:`${item.title} is inactive now.`})
        }
        if(variant.stock < item.quantity) {
            return res.json({success:false,message:`${item.title} has only ${variant.stock} left.`})
        }
    }
    return res.json({success:true})
})

const retryPaymentDirect = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    const orderId = req.params.orderId

    const order = await Order.findOne({_id:orderId,user:userId,paymentStatus:{$ne:'COMPLETED'},paymentMethod:'CARD'})
    
    if(!order) {
        return res.redirect('/checkout?error=retry')
    }

    try {
        const razorOrder = await razorpay.orders.create({
            amount:Math.round(order.totalAmount * 100),currency:'INR',receipt:order._id.toString()
        })

        await Order.findByIdAndUpdate(orderId,{razorpayOrderId:razorOrder.id})

        return res.render('user/razorpayPage',{layout:'layouts/userLogin',razorOrder,total:order.totalAmount,addressIndex:0,key_id:process.env.RAZORPAY_KEY_ID,retry:true,orderId})
    } catch (err) {
        console.log('Retry razorpay error', err)
        return res.redirect('/checkout?error=payment')
    }
})

const viewOrderSuccess = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    if(!userId) return res.redirect('/auth/login')
    
    const order = await Order.findById(req.params.id).populate('user','email').lean()
    if(!order) return res.redirect('/')
        
    res.render('user/orderSuccess',{layout:'layouts/user_main',order})
})

const viewOrderFail = asyncHandler( async( req,res) => {
    const orderId = req.params.orderId
    res.render('user/orderFail',{layout:'layouts/user_main',orderId})
})

const retryPayment = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    const {orderId} = req.params
    if(!userId) return res.redirect('/auth/login')

    const order = await Order.findOne({_id:orderId,user:userId,paymentMethod:'CARD',paymentStatus:'FAILED'}).lean()
    if(!order) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.CARD.CARD_ONLY_RETRY})
    }

    const cartItems = order.items.map((item) => ({
        product_id:item.product,
        variant_id:item.variantId,
        quantity:item.quantity,
    }))

    await Cart.updateOne({user_id:userId},{$set:{items:cartItems}},{upsert:true})

    if(order.coupon && order.coupon.code) {
        req.session.coupon = {
            code:order.coupon.code,
            discountAmount:order.coupon.discountAmount
        }
    }else{
        req.session.coupon = null
    }
    req.session.lastFailedOrderId = orderId
    return res.redirect('/checkout?retry=1')
})

module.exports = {loadCheckout,placeOrder,viewOrderSuccess,verifyRazorpay,viewOrderFail,retryPayment,retryCheckStock,retryPaymentDirect}
