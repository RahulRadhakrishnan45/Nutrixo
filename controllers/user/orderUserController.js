const asyncHandler = require('express-async-handler')
const messages = require('../../constants/messages')
const httpStatus = require('../../constants/httpStatus')
const Address = require('../../models/addressSchema')
const Cart = require('../../models/cartSchema')
const Order = require('../../models/orderSchema')
const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const pdfDocument = require('pdfkit')


const loadOrders = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    if(!userId) return res.redirect('/auth/login')

    const page = parseInt(req.query.page) || 1
    const limit = 4
    const skip = (page - 1) * limit

    const totalOrder = await Order.countDocuments({user:userId})
    const totalPages = Math.ceil(totalOrder / limit)

    const orders = await Order.find({user:userId}).populate('orderAddress').populate('items.product').sort({createdAt:-1}).skip(skip).limit(limit).lean()

    res.render('user/order',{layout:'layouts/user_main',orders,currentPage:page,totalPages,query:req.query})
})

const loadOrderTracking = asyncHandler( async( req,res) => {
    const orderId = req.params.orderId
    const userId = req.session.user._id
    const itemId = req.query.itemId

    const order = await Order.findOne({_id:orderId,user:userId}).populate('orderAddress').populate('user','name email').lean()
 
    if(!order) { 
        return res.status(httpStatus.not_found).json({success:false,message:messages.ORDER.ORDER_NOT_FOUND})
    }
    let primaryItem = (order.items && order.items.length) ? order.items[0] : null

    if(itemId && order.items && order.items.length) {
        const found = order.items.find(i => String(i._id) === String(itemId))
        if(found) primaryItem = found
    }

    res.render('user/trackingPage',{layout:'layouts/user_main',order,primaryItem})
})

const cancelSingleOrder = asyncHandler( async( req,res) => {
    const orderId = req.params.orderId
    const itemId = req.params.itemId
    const userId = req.session.user._id
    const reason = (req.body.reason || '').trim()

    const order = await Order.findOne({_id:orderId,user:userId})

    if(!order) {
        return req.xhr ? res.status(httpStatus.not_found).json({success:false,message:messages.ORDER.ORDER_NOT_FOUND}): res.redirect('/orders')
    }

    const item = order.items.find(i => i._id.toString() === itemId)

    if(!item) {
        return req.xhr ? res.status(httpStatus.not_found).json({success:false,message:messages.PRODUCT.PRODUCT_NOT_FOUND}) : res.redirect('/orders')
    }

    const notAllowed = ['DELIVERED','RETURNED','CANCELLED']
    if(notAllowed.includes(item.status)) {
        return req.xhr ? res.status(httpStatus.bad_request).json({success:false,message:messages.ORDER.ORDER_CANNONT_CANCEL}) : res.redirect('/orders')
    }

    item.previousStatus = item.status
    item.status = "CANCELLATION REQUESTED"
    item.cancellationRequest.status = "REQUESTED"
    item.cancellationRequest.reason = reason || "No reason provided"
    item.cancellationRequest.requestedAt = new Date()

    item.statusHistory = item.statusHistory || []
    item.statusHistory.push({
        status:'CANCELLATION REQUESTED',
        note:reason? `User reason : ${reason}`:'User requested cancellation',
        timestamp: new Date()
    })
    
    await order.save()

    if(req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(httpStatus.ok).json({success:true,message:messages.ORDER.ORDER_CANCELATION_REQUESTED})
    }

    return res.redirect(`/order/${orderId}`)
})

const cancelEntireOrder = asyncHandler( async( req,res) => {
    const {orderId} = req.params
    const {reason} = req.body
    const userId = req.session.user._id

    if(!reason || reason.trim().length === 0) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.AUTH.CANCEL_REASON_REQUIRED})
    }

    const order = await Order.findOne({_id:orderId,user:userId})
    if(!order) return res.status(httpStatus.not_found).json({success:false,message:messages.ORDER.ORDER_NOT_FOUND})

    let anyUpdated = false
    order.items.forEach((item) => {
        if(['PROCESSING','PACKED','SHIPPED'].includes(item.status)) {
            item.previousStatus = item.status
            item.status = 'CANCELLATION REQUESTED'
            item.cancellationRequest.status = 'REQUESTED'
            item.cancellationRequest.reason = reason
            item.cancellationRequest.requestedAt = new Date()

            item.statusHistory.push({
                status:'CANCELLATION REQUESTED',
                note:`Full order cancellation requested by user: ${reason}`,
                timestamp: new Date()
            })
            anyUpdated = true
        }
    })

    if(!anyUpdated) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.ORDER.ORDER_CANNONT_CANCEL})
    }

    await order.save()
    res.status(httpStatus.ok).json({success:true,message:messages.ORDER.ORDER_CANCELATION_REQUESTED})
})

const downloadInvoice = asyncHandler(async (req, res) => {
  const userId = req.session.user._id
  if (!userId) return res.redirect('/auth/login')

  const orderId = req.params.orderId

  const order = await Order.findOne({ _id: orderId, user: userId }).lean()
  if (!order) {
    return res
      .status(httpStatus.not_found)
      .json({ success: false, message: messages.ORDER.ORDER_NOT_FOUND })
  }

  const doc = new pdfDocument({ margin: 50 })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`)
  doc.pipe(res)

  doc.fontSize(18).font('Helvetica-Bold').text('Tax Invoice', { align: 'center' })
  doc.moveDown(1.5)

  doc.fontSize(12).font('Helvetica')
  doc.text(`Order Number: ${order.orderNumber}`)
  doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`)
  doc.text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`)
  doc.text(`Payment Method: ${order.paymentMethod || 'N/A'}`)
  doc.text(`Payment Status: ${order.paymentStatus || 'PENDING'}`)
  doc.moveDown(0.8)

  const addr = order.orderAddress
  doc.font('Helvetica-Bold').text('Shipping Address', { underline: true })
  doc.moveDown(0.4)
  doc.font('Helvetica')
  doc.text(`${addr.fullname}`)
  doc.text(`${addr.address}`)
  doc.text(`${addr.district}, ${addr.state} - ${addr.pincode}`)
  doc.text(`${addr.country}`)
  doc.text(`Mobile: ${addr.mobile}`)
  doc.moveDown(1.5)

  const startX = 50
  const tableTop = doc.y

  doc.font('Helvetica-Bold')
  doc.text('Product Name', startX, tableTop)
  doc.text('Qty', 250, tableTop)
  doc.text('Price', 300, tableTop)
  doc.text('Status', 380, tableTop)
  doc.text('Payment', 470, tableTop)
  doc.text('Total', 540, tableTop, { align: 'right' })

  doc.moveDown(0.3)
  doc.moveTo(startX, doc.y).lineTo(560, doc.y).stroke()
  doc.moveDown(0.6)

  doc.font('Helvetica').fontSize(10)

  let subtotal = 0
  let taxTotal = 0
  let totalPaid = 0
  const TAX_RATE = 0.02

  order.items.forEach((item) => {
    const lineY = doc.y

    let itemPaymentStatus = 'PENDING';
    if (order.paymentStatus === 'COMPLETED') {
      itemPaymentStatus = 'PAID'
    } else {
      if (['DELIVERED', 'RETURNED'].includes(item.status)) {
        itemPaymentStatus = 'PAID'
      } else if (['CANCELLATION REQUESTED', 'CANCELLED'].includes(item.status)) {
        itemPaymentStatus = 'REFUND IN PROCESS'
      } else {
        itemPaymentStatus = 'PENDING'
      }
    }

    const includeInTotal = !['CANCELLED', 'RETURNED'].includes(item.status)
    const itemTotal = item.price * item.quantity

    doc.text(item.title, startX, lineY, { width: 180 })
    doc.text(`${item.quantity}`, 250, lineY)
    doc.text(`Rs. ${item.price.toFixed(2)}`, 300, lineY)
    doc.text(item.status, 380, lineY)
    doc.text(itemPaymentStatus, 470, lineY)
    doc.text(`Rs. ${itemTotal.toFixed(2)}`, 540, lineY, { align: 'right' })

    doc.moveDown(0.6)

    if (includeInTotal) {
      subtotal += itemTotal
      taxTotal += itemTotal * TAX_RATE
      totalPaid += itemTotal + itemTotal * TAX_RATE
    }
  })

  doc.moveTo(startX, doc.y).lineTo(560, doc.y).stroke()
  doc.moveDown(1.5)

  const summaryX = 350
  doc.fontSize(11).font('Helvetica')
  doc.text('Subtotal:', summaryX, doc.y, { continued: true })
  doc.text(`Rs. ${subtotal.toFixed(2)}`, { align: 'right' })

  doc.text('Tax (2%):', summaryX, doc.y, { continued: true })
  doc.text(`Rs. ${taxTotal.toFixed(2)}`, { align: 'right' })

  doc.moveDown(0.8);
  doc.font('Helvetica-Bold')
  doc.text('Total Amount:', summaryX, doc.y, { continued: true })
  doc.text(`Rs. ${totalPaid.toFixed(2)}`, { align: 'right' })

  doc.moveDown(1)
  doc.fontSize(10).font('Helvetica-Oblique').text(
    '*Cancelled or returned products are excluded from total calculations.',
    { align: 'center' }
  )

  doc.end()
})


const returnSingleOrder = asyncHandler( async( req,res) => {
    const {orderId,itemId} = req.params
    const userId = req.session.user._id
    const reason = (req.body.reason || '').trim()

    const order = await Order.findOne({_id:orderId,user:userId})
    if(!order) {
        return req.xhr ? res.status(httpStatus.not_found).json({success:false,message:messages.ORDER.ORDER_NOT_FOUND}) : res.redirect('/orders')
    }

    const item = order.items.find((i) => i._id.toString() === itemId)
    if(!item) {
        return res.xhr ? res.status(httpStatus.not_found).json({success:false,message:messages.PRODUCT.PRODUCT_NOT_FOUND}) : res.redirect('/orders')
    }

    if(item.status !== 'DELIVERED') {
        return req.xhr ? res.status(httpStatus.bad_request).json({success:false,message:messages.RETURN.RETURN_ALLOWED_ONLY_DELIVERED}) : res.redirect(`/orders/${orderId}`)
    }

    if(item.returnRequest && item.returnRequest.status === 'REQUESTED') {
        return req.xhr ? res.status(httpStatus.bad_request).json({success:false,message:messages.RETURN.RETURN_ALREDY_SUBMITTED}) : res.redirect(`/orders/${orderId}`)
    }

    item.status = 'RETURN REQUESTED'
    item.returnRequest = {
        status:'REQUESTED',
        reason:reason || 'No reason provided',
        requestedAt: new Date()
    }

    item.statusHistory = item.statusHistory || []
    item.statusHistory.push({
        status:'RETURN REQUESTED',
        note:reason ? `User reason : ${reason}` : 'User requested return',
        timestamp: new Date()
    })

    await order.save()

    if(req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(httpStatus.ok).json({success:true,message:messages.RETURN.RETURN_SUBMITTED})
    }

    return res.redirect(`/orders/${orderId}`)
})

const returnEntireOrder = asyncHandler( async( req,res) => {
    const orderId = req.params.orderId
    const {reason} = req.body
    const userId = req.session.user._id

    if(!reason || reason.trim().length === 0) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.RETURN.RETURN_REASON_REQUIRED})
    }

    const order = await Order.findOne({_id:orderId,user:userId})
    if(!order) return res.status(httpStatus.not_found).json({success:false,message:messages.ORDER.ORDER_NOT_FOUND})
    
    let allDelivered = order.items.every((item) => item.status === 'DELIVERED')
    if(!allDelivered) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.RETURN.RETURN_NOT_AVAILABLE})
    }

    for(const item of order.items) {
        item.previousStatus = item.status
        item.status = "RETURN REQUESTED"
        item.returnRequest = {
            status:'REQUESTED',
            reason:reason,
            requestedAt: new Date()
        }

        item.statusHistory = item.statusHistory || []
        item.statusHistory.push({
            status:'RETURN REQUESTED',
            note:`Full order return requested by user : ${reason}`,
            timestamp: new Date()
        })

        const product = await Product.findById(item.product)
        if(product && product.variants && product.variants.length > 0) {
            const variant = product.variants.id(item.variantId)
            if(variant) {
                variant.stock += item.quantity
            }
            await product.save()
        }else if(product) {
            product.stock += item.quantity
            await product.save()
        }
    }

    await order.save()

    res.status(httpStatus.ok).json({success:true,message:messages.RETURN.RETURN_SUBMITTED})
})


module.exports = {loadOrders,loadOrderTracking,cancelSingleOrder,cancelEntireOrder,downloadInvoice,returnSingleOrder,returnEntireOrder}
   