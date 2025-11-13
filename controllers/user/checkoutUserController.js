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
const applyOffersToProduct = require('../../utils/applyOffer')


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

    const today = new Date()
    const coupons = await Coupon.find({isActive:true,startDate:{$lte:today},endDate:{$gte:today},}).lean()

    res.render('user/checkout',{layout:'layouts/user_main',addresses,coupons,cart:{...cart,items:validItems},actualPrice:actualPrice.toFixed(2),offerDiscount:offerDiscount.toFixed(2),subtotal:subtotalAfterOffer.toFixed(2),couponDiscount:couponDiscount.toFixed(2),totalDiscount:totalDiscount.toFixed(2),tax:tax.toFixed(2),total:total.toFixed(2),appliedCoupon,cartLength:validItems.length || 0,selectedId:req.query.selected || null,error:req.query.error || null})
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

    const orderItem = []
    for(const item of updatedItems) {
        const product = item.product_id
        const variant = product.variants.find((v) => v._id.toString() === item.variant_id.toString())
        if(!variant) continue

        const offeredProduct = await applyOffersToProduct(product,activeOffers)
        const offeredVariant = offeredProduct.variants.find((v) => v._id.toString() === variant._id.toString())

        const finalPrice = offeredVariant?.calculated_price || variant.price
        const basePrice = variant.price
        const offerApplied = offeredVariant?.offerPercent || 0

        orderItem.push({
            product: product._id,
            variantId: variant._id,
            title: product.title,
            flavour: variant.flavour,
            size: variant.size,
            image: variant.images?.[0] || null,
            price: finalPrice,
            quantity: item.quantity,
            totalPrice: finalPrice * item.quantity,
            tax: Number((finalPrice * item.quantity * 0.02).toFixed(2)),
            discount: (basePrice - finalPrice) * item.quantity,
            offerApplied,
        })
    }

    const embeddedAddress = {fullname: selectedAddress.fullname,mobile: selectedAddress.mobile,address: selectedAddress.address,district: selectedAddress.district,state: selectedAddress.state,country: selectedAddress.country,pincode: selectedAddress.pincode}

    const orderData = await Order.create({
        user:userId,
        orderAddress:embeddedAddress,
        paymentMethod,
        actualTotal,
        offerDiscount,
        subtotal,
        tax,
        couponDiscount,
        totalAmount:total,
        totalDiscount,
        items:orderItem
    })

    if(appliedCoupon) {
        orderData.coupon = appliedCoupon._id
    }

    const order = await Order.create(orderData)

    for(const item of orderItem) {
        await Product.updateOne(
            {_id:item.product,'variants._id':item.variantId},{$inc:{'variants.$.stock':-item.quantity}}
        )
    }

    await Cart.findOneAndUpdate({user_id:userId},{$set:{items:[]}})
    res.redirect(`/checkout/${order._id}/success`)
})

const viewOrderSuccess = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    if(!userId) return res.redirect('/auth/login')
    
    const order = await Order.findById(req.params.id).populate('user','email').lean()
    if(!order) return res.redirect('/')
        
    res.render('user/orderSuccess',{layout:'layouts/user_main',order})
})

module.exports = {loadCheckout,placeOrder,viewOrderSuccess}
