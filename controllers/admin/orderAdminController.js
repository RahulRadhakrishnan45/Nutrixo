const asyncHandler = require('express-async-handler')
const User = require('../../models/userSchema')
const Order = require('../../models/orderSchema')
const Product = require('../../models/productSchema')
const messages = require('../../constants/messages')
const httpStatus = require('../../constants/httpStatus')
const {STATUS_ENUM} = require('../../constants/orderStatus')
const { creditToWallet } = require('../../utils/walletRefund')


const loadOrders = asyncHandler( async( req,res) => {
    const {search = '', paymentStatus = '', sort = 'newest', page = 1 } = req.query
    const filter = {}

    if(search) {
        const users = await User.find({email:{$regex:search,$options:'i'},}).select('_id')
        filter.$or = [
            {orderNumber:{$regex:search,$options:'i'}},{user:{$in:users.map((u)=>u._id)}},
        ]
    }

    if(paymentStatus) {
        filter.paymentStatus = paymentStatus.toUpperCase()
    }

    const sortOrder = sort === 'oldest' ? 1 : -1

    const limit = 5
    const currentPage = parseInt(page) || 1
    const skip = (currentPage - 1) * limit

    const totalOrder = await Order.countDocuments(filter)
    const totalPages = Math.ceil(totalOrder / limit)

    const orders = await Order.find(filter).populate('user','email').sort({createdAt:sortOrder}).skip(skip).limit(limit).lean()

    res.render('admin/order',{layout:'layouts/admin_main',orders,search,paymentStatus,sort,currentPage,totalPages,query:req.query})
})

const loadOrderDetails = asyncHandler( async( req,res) => {
    const orderId = req.params.orderId
    const order = await Order.findById(orderId).populate('user','name email').populate('items.product','name image').populate('coupon','code name').lean()

    if(!order) return res.status(httpStatus.not_found).json({success:false,message:messages.ORDER.ORDER_NOT_FOUND})

    res.render('admin/orderDetail',{layout:'layouts/admin_main',order,STATUS_ENUM})
})

const updateItemStatus = asyncHandler( async( req,res) => {
    const {orderId,itemId} = req.params
    const {status} = req.body

    const order = await Order.findById(orderId)
    if(!order) return res.status(httpStatus.not_found).json({message:messages.ORDER.ORDER_NOT_FOUND})
    
    const item = order.items.id(itemId)
    if(!item) return res.status(httpStatus.not_found).json({message:messages.PRODUCT.PRODUCT_NOT_FOUND})

    item.status = status
    order.markModified('items')
    await order.save()

    res.json({success:true,message:messages.ITEM.ITEM_UPDATED})
})

const approveCancellation = asyncHandler( async( req,res) => {
    const {orderId, itemId} = req.params
    
    const order = await Order.findById(orderId)
    if(!order) return res.status(httpStatus.not_found).json({success:false,message:messages.ORDER.ORDER_NOT_FOUND})
    
    const item = order.items.id(itemId)
    if(!item) return res.status(httpStatus.not_found).json({success:false,message:messages.PRODUCT.PRODUCT_NOT_FOUND})

    if(!item.cancellationRequest || item.cancellationRequest.status !== 'REQUESTED') {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.CANCELLATION.CANCELLATION_NOT_REQUESTED})
    }

    item.previousStatus = item.status
    item.status = 'CANCELLED'

    const refundAmount = (Number(item.offerPrice) || 0) * (Number(item.quantity) || 0) - (Number(item.couponDiscount) || 0) + (Number(item.tax) || 0)

    if(['CARD','WALLET','BANK'].includes(order.paymentMethod)) {
        await creditToWallet(
            order.user,refundAmount,`Refund for cancelled item: ${item.title}`,orderId
        )
    }

    item.cancellationRequest.status = 'APPROVED'
    item.cancellationRequest.resolvedAt = new Date()
    item.cancellationRequest.refundAmount = refundAmount

    item.statusHistory = item.statusHistory || []
    item.statusHistory.push({
        status:'CANCELLED',
        timestamp: new Date(),
        note:'Admin approved cancellation & processed refund'
    })

    const product = await Product.findById(item.product)
    if(product && product.variants && product.variants.length > 0) {
        const variant = product.variants.id(item.variantId)
        if(variant) {
            variant.stock += item.quantity
        }
        await product.save()
    }
    
    order.markModified('items')

    await order.save()

    res.json({success:true,message:messages.CANCELLATION.CANCELLATION_APPROVED})
})

const rejectCancellation = asyncHandler( async( req,res) => {
    const {orderId,itemId} = req.params
    
    const order = await Order.findById(orderId)
    if(!order) return res.status(httpStatus.not_found).json({success:false,message:messages.ORDER.ORDER_NOT_FOUND})

    const item = order.items.id(itemId)
    if(!item) return res.status(httpStatus.not_found).json({success:false,message:messages.PRODUCT.PRODUCT_NOT_FOUND})

    item.cancellationRequest.status = 'REJECTED'
    
    if(item.status === 'CANCELLATION REQUESTED') {
        item.status = item.previousStatus
        item.previousStatus = null
    }

    order.markModified('items')
    await order.save()

    res.json({success:true,message:messages.CANCELLATION.CANCELLATION_REJECTED})
})

const approveReturn = asyncHandler( async( req,res) => {
    const {orderId,itemId} = req.params

    const order = await Order.findById(orderId)
    if(!order) return res.status(httpStatus.not_found).json({success:false,message:messages.ORDER.ORDER_NOT_FOUND})

    const item = order.items.id(itemId)
    if(!item) return res.status(httpStatus.not_found).json({success:false,message:messages.PRODUCT.PRODUCT_NOT_FOUND})

    if(!item.returnRequest || item.returnRequest.status !== 'REQUESTED') {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.RETURN.RETURN_NOT_REQUESTED})
    }

    const refundAmount = item.offerPrice * item.quantity - item.couponDiscount + item.tax

    await creditToWallet(
        order.user,refundAmount,`Refund for returned item : ${item.title}`,orderId
    )

    item.returnRequest.status = 'COMPLETED'
    item.returnRequest.resolvedAt = new Date()
    item.returnRequest.refundAmount = refundAmount

    item.previousStatus = item.status
    item.status = 'RETURNED'

    item.statusHistory.push({
        status:'RETURNED', timestamp: new Date(), note: 'Admin approved return & refund completed'
    })

    const product = await Product.findById(item.product)
    if(product) {
        if(product.variants && product.variants.length > 0) {
            const variant = product.variants.id(item.variantId)
            if(variant) variant.stock += item.quantity
        }

        await product.save()
    }

    order.markModified('items')
    
    await order.save()

    res.json({success:true,message:messages.RETURN.RETURN_APPROVED})
})

const rejectReturn = asyncHandler( async( req,res) => {
    const {orderId,itemId} = req.params

    const order = await Order.findById(orderId)
    if(!order) return res.status(httpStatus.not_found).json({success:false,message:messages.ORDER.ORDER_NOT_FOUND})

    const item = order.items.id(itemId)
    if(!item) return res.status(httpStatus.not_found).json({success:false,message:messages.PRODUCT.PRODUCT_NOT_FOUND})

    item.returnRequest.status = 'REJECTED'
    item.status = 'DELIVERED'
    order.markModified('items')
    await order.save()

    res.json({success:true,message:messages.RETURN.RETURN_REJECT})
})




module.exports = {loadOrders,loadOrderDetails,updateItemStatus,approveCancellation,rejectCancellation,approveReturn,rejectReturn}
