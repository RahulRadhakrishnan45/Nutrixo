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

const cancelOrder = asyncHandler( async( req,res) => {
    const orderId = req.params.orderId
    const itemId = req.params.itemId
    const userId = req.session.user._id

    const order = await Order.findOne({_id:orderId,user:userId})

    if(!order) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.ORDER.ORDER_NOT_FOUND})
    }

    const item = order.items.id(itemId)

    if(!item) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.PRODUCT.PRODUCT_NOT_FOUND})
    }

    if(item.status === 'PROCESSING' || item.status === "PACKED") {
        item.status === 'CANCELLED'
        item.statusHistory.push({
            status:'CANCELLED',
            note:'Item cancelled by the user'
        })
        await order.save()
        return res.redirect(`/order/${orderId}`)
    }else{
        return res.status(httpStatus.bad_request).json({success:false,message:'This item cannot be cancelled at this stage'})
    }
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
  doc.text(`Payment Status: ${order.paymentStatus || 'PENDING'}`)
  doc.text(`Payment Method: ${order.paymentMethod}`)
  doc.moveDown(0.8)

  const addr = order.orderAddress
  doc.font('Helvetica-Bold').text('Shipping Address', { underline: true })
  doc.moveDown(0.4);
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
  doc.text('Qty', 280, tableTop)
  doc.text('Price Paid', 330, tableTop)
  doc.text('Status', 430, tableTop)
  doc.text('Total Paid', 520, tableTop, { align: 'right' })

  doc.moveDown(0.3)
  doc.moveTo(startX, doc.y).lineTo(560, doc.y).stroke()
  doc.moveDown(0.6)

  doc.font('Helvetica').fontSize(10)

  order.items.forEach((item) => {
    const lineY = doc.y

    doc.text(item.title, startX, lineY, {
      width: 200,
      continued: false,
    })

    doc.text(`${item.quantity}`, 280, lineY)
    doc.text(`Rs. ${item.price.toFixed(2)}`, 330, lineY)
    doc.text(item.status, 430, lineY)
    doc.text(`Rs. ${item.totalPrice.toFixed(2)}`, 520, lineY, { align: 'right' })

    doc.moveDown(0.6)
  })

  doc.moveTo(startX, doc.y).lineTo(560, doc.y).stroke()
  doc.moveDown(1.5)

  const subtotal = order.subtotal || 0
  const tax = order.tax || 0
  const total = order.totalAmount || 0

  doc.fontSize(11)
  const summaryX = 350

  doc.text('Original Price:', summaryX, doc.y, { continued: true })
  doc.text(`Rs. ${subtotal.toFixed(2)}`, { align: 'right' })

  doc.text('Subtotal (After Offer):', summaryX, doc.y, { continued: true })
  doc.text(`Rs. ${subtotal.toFixed(2)}`, { align: 'right' })

  doc.text('Tax (5%):', summaryX, doc.y, { continued: true })
  doc.text(`Rs. ${tax.toFixed(2)}`, { align: 'right' })

  doc.moveDown(0.8)
  doc.font('Helvetica-Bold')
  doc.text('Item Total (Inc. Tax):', summaryX, doc.y, { continued: true })
  doc.text(`Rs. ${total.toFixed(2)}`, { align: 'right' })

  doc.end()
})



module.exports = {loadOrders,loadOrderTracking,cancelOrder,downloadInvoice}