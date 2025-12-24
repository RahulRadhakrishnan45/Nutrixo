const asyncHandler = require('express-async-handler')
const Order = require('../../models/orderSchema')
const {buildDateRange, buildMatch} = require('../../utils/dateFilter')
const path = require('path')
const ejs = require('ejs')
const ExcelJS = require('exceljs')
const PDFDocument = require('pdfkit')
const mongoose = require('mongoose')

const loadSalesReport = asyncHandler( async( req,res) => {
    const {filterType = 'daily',from,to} = req.query
    const page = parseInt(req.query.page) || 1
    const limit = 5
    const skip = (page - 1) * limit

    const {startDate, endDate} = buildDateRange(filterType,from, to)
    const match = buildMatch(startDate, endDate)
    match['items.status'] = {$nin:['CANCELLED','RETURNED']}

    const data = await Order.aggregate([
        {$match:match},
        {$facet:{totals:[
            {$group:{_id:null,totalOrders:{$sum:1},totalRevenue:{$sum:'$totalAmount'},totalDiscount:{$sum:'$totalDiscount'},}}
        ],
        orders:[{$sort:{createdAt:-1}},{$skip:skip},{$limit:limit},
            {$lookup:{from:'users',localField:'user',foreignField:'_id',as:'user'}},
            {$unwind:{path:'$user',preserveNullAndEmptyArrays:true}},
            {$project:{
                orderNumber:1,createdAt:1,subtotal:1,totalAmount:1,totalDiscount:1,paymentMethod:1,'user.name':1,
            }}
        ],
        count:[{$count:'count'}]
    }}
    ])

    const totals = data[0].totals[0] || {
        totalOrders:0,totalRevenue:0,totalDiscount:0
    }

    const orders = data[0].orders
    const totalCount = data[0].count[0]?.count || 0
    const totalPages = Math.ceil(totalCount / limit)

    res.render('admin/report',{layout:'layouts/admin_main',orders,totalOrders:totals.totalOrders,totalRevenue:totals.totalRevenue,totalDiscount:totals.totalDiscount,filterType,fromDate:from || '',toDate:to || '',currentPage:page,totalPages,query:req.query})

})

const downloadExcel = asyncHandler( async( req,res) => {
    const {filterType = 'daily', from, to, onlyCompleted} = req.query
    
    const {startDate, endDate} = buildDateRange(filterType, from, to)
    const match = buildMatch(startDate, endDate, {onlyCompleted:onlyCompleted === 'true'})
    match['items.status'] = { $nin: ['CANCELLED', 'RETURNED'] }
    
    const rows = await Order.aggregate([
        {$match:match},{$sort:{createdAt:-1}},
        {$lookup:{from:'users',localField:'user',foreignField:'_id',as:'user'},},
        {$unwind:{path:'$user',preserveNullAndEmptyArrays:true}},
    ])

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Sales Report')

    sheet.columns = [
      { header: 'Order No', key: 'orderNumber', width: 15 },
      { header: 'User', key: 'userName', width: 20 },
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Subtotal (₹)', key: 'subtotal', width: 15 },
      { header: 'Discount (₹)', key: 'discount', width: 15 },
      { header: 'Total Amount (₹)', key: 'totalAmount', width: 18 },
      { header: 'Payment Method', key: 'paymentMethod', width: 15 },
    ]

    rows.forEach(r => {
        sheet.addRow({
            orderNumber:r.orderNumber,
            userName: r.user?.name || 'Unknown',
            date: new Date(r.createdAt).toLocaleString('en-IN'),
            subtotal: r.subtotal || 0,
            discount: r.totalDiscount || 0,
            totalAmount: r.totalAmount || 0,
            paymentMethod: r.paymentMethod || '',
        })
    })

    sheet.addRow({})

    const totalSubtotal = rows.reduce((a,b) => a + (b.subtotal || 0), 0)
    const totalDiscount = rows.reduce((a, b) => a + (b.totalDiscount || 0), 0)
    const grandTotal = rows.reduce((a, b) => a + (b.totalAmount || 0), 0)

    const totalRow = sheet.addRow({
        orderNumber: 'TOTAL',
        subtotal: totalSubtotal,
        discount: totalDiscount,
        totalAmount: grandTotal,
    })

    totalRow.font = { bold: true }

    res.setHeader(
        'Content-Disposition',
        `attachment; filename="sales-report-${Date.now()}.xlsx"`
    )

    await workbook.xlsx.write(res)
    res.end()
})

const downloadPdf = asyncHandler(async (req, res) => {
  try {
    const { filterType = 'daily', from, to, onlyCompleted } = req.query

    const { startDate, endDate } = buildDateRange(filterType, from, to)
    const match = buildMatch(startDate, endDate, {
      onlyCompleted: onlyCompleted === 'true',
    });
    match['items.status'] = { $nin: ['CANCELLED', 'RETURNED'] }

    const result = await Order.aggregate([
      { $match: match },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
                totalDiscount: { $sum: { $ifNull: ['$totalDiscount', 0] } },
              },
            },
          ],
          data: [
            { $sort: { createdAt: -1 } },
            {
              $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'user',
              },
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          ],
        },
      },
    ])

    const totals = result[0]?.totals[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      totalDiscount: 0,
    }
    const orders = result[0]?.data || []

    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 50,
      autoFirstPage: true
    })

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="sales-report-${Date.now()}.pdf"`
    )
    doc.pipe(res)

    doc.fontSize(20).font('Helvetica-Bold').text('Sales Report', { align: 'center' })
    doc.moveDown(0.5)

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    }

    const reportTypeText = filterType.charAt(0).toUpperCase() + filterType.slice(1)
    
    let subtitleText = `Report Type: ${reportTypeText}`
    
    if (startDate && endDate) {
      const formattedStart = formatDate(startDate)
      const formattedEnd = formatDate(endDate)
      subtitleText += ` (${formattedStart} - ${formattedEnd})`
    }

    doc.fontSize(10).font('Helvetica').text(subtitleText, { align: 'center' })
    doc.moveDown(1.5)

    doc.fontSize(12).font('Helvetica-Bold').text('Summary')
    doc.moveDown(0.5)
    doc.fontSize(10).font('Helvetica')
    doc.text(`Total Orders: ${totals.totalOrders}`)
    doc.text(`Total Revenue: ₹${totals.totalRevenue.toFixed(2)}`)
    doc.text(`Total Discount: ₹${totals.totalDiscount.toFixed(2)}`)
    doc.text(`Net Revenue: ₹${(totals.totalRevenue - totals.totalDiscount).toFixed(2)}`)
    doc.moveDown(2)

    if (!orders.length) {
      doc.fontSize(12).text('No orders found for the selected period.', { align: 'center' });
      doc.end()
      return
    }

    const col = { 
      id: 50,
      customer: 150,
      date: 300,
      amount: 420
    }
    const rowHeight = 25
    
    const pageHeight = doc.page.height
    const pageMargin = doc.page.margins.bottom
    const maxY = pageHeight - pageMargin - 30

    function drawTableHeader(y) {
      doc.rect(50, y, 495, rowHeight).fill('#4472C4');
      doc.font('Helvetica-Bold').fontSize(10).fillColor('white')
        .text('Order ID', col.id + 5, y + 8, { width: 90 })
        .text('Customer', col.customer + 5, y + 8, { width: 140 })
        .text('Date', col.date + 5, y + 8, { width: 110 })
        .text('Amount', col.amount + 5, y + 8, { width: 115 });
      doc.font('Helvetica').fontSize(9).fillColor('black');
    }

    let currentY = doc.y
    drawTableHeader(currentY)
    currentY += rowHeight

    orders.forEach((order, index) => {
      const willFit = (currentY + rowHeight) <= maxY
      
      if (!willFit) {
        doc.addPage()
        currentY = 50
        drawTableHeader(currentY)
        currentY += rowHeight
      }

      if (index % 2 === 0) {
        doc.rect(50, currentY, 495, rowHeight).fill('#F2F2F2')
      }

      const orderId = order.orderNumber || order._id.toString().slice(-8)
      const customer = order.user?.name || 'Guest'
      const date = new Date(order.createdAt).toLocaleDateString('en-IN')
      const amount = `₹${order.totalAmount?.toFixed(2) || '0.00'}`

      doc.fillColor('black')
        .text(orderId, col.id + 5, currentY + 8, { width: 90, ellipsis: true })
        .text(customer, col.customer + 5, currentY + 8, { width: 140, ellipsis: true })
        .text(date, col.date + 5, currentY + 8, { width: 110 })
        .text(amount, col.amount + 5, currentY + 8, { width: 115 })

      currentY += rowHeight
    })

    doc.end()

  } catch (error) {
    console.error('PDF generation error:', error)
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate PDF',
        error: error.message,
      })
    }
  }
})

module.exports = {loadSalesReport,downloadExcel,downloadPdf}
