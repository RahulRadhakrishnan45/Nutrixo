const asyncHandler = require('express-async-handler')
const User = require('../../models/userSchema')
const Order = require('../../models/orderSchema')
const Product = require('../../models/productSchema')
const messages = require('../../constants/messages')
const httpStatus = require('../../constants/httpStatus')
const {STATUS_ENUM} = require('../../constants/orderStatus')


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
    const order = await Order.findById(orderId).populate('user','name email').populate('items.product','name image').lean()

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

    item.status = 'CANCELLED'
    item.cancellationRequest.status = 'APPROVED'
    order.markModified('items')
    await order.save()

    const product = await Product.findById(item.product)
    if(product && product.variants && product.variants.length > 0) {
        const variant = product.variants.id(item.variantId)
        if(variant) {
            variant.stock += item.quantity
            await product.save()
        }
    }

    res.json({success:true,message:messages.CANCELLATION.CANCELLATION_APPROVED})
})

const rejectCancellation = asyncHandler( async( req,res) => {
    const {orderId,itemId} = req.params
    
    const order = await Order.findById(orderId)
    if(!order) return res.status(httpStatus.not_found).json({success:false,message:messages.ORDER.ORDER_NOT_FOUND})

    const item = order.items.id(itemId)
    if(!item) return res.status(httpStatus.not_found).json({success:false,message:messages.PRODUCT.PRODUCT_NOT_FOUND})

    item.cancellationRequest.status = 'REJECTED'
    item.status = 'PROCESSING'
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

    item.status = 'RETURNED'
    item.returnRequest.status = 'APPROVED'
    order.markModified('items')
    await order.save()

    const product = await Product.findById(item.product)
    if(product && product.variants && product.variants.length > 0) {
        const variant = product.variants.id(item.variantId)
        if(variant) {
            variant.stock += item.quantity
            await product.save()
        }
    }

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
