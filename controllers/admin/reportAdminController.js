const asyncHandler = require('express-async-handler')
const Order = require('../../models/orderSchema')
const {buildDateRange, buildMatch} = require('../../utils/dateFilter')
const path = require('path')
const ejs = require('ejs')
const ExcelJS = require('exceljs')
const puppeteer = require('puppeteer')
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
      { header: "Order No", key: "orderNumber", width: 15 },
      { header: "User", key: "userName", width: 20 },
      { header: "Date", key: "date", width: 20 },
      { header: "Subtotal (₹)", key: "subtotal", width: 15 },
      { header: "Discount (₹)", key: "discount", width: 15 },
      { header: "Total Amount (₹)", key: "totalAmount", width: 18 },
      { header: "Payment Method", key: "paymentMethod", width: 15 },
    ]

    rows.forEach(r => {
        sheet.addRow({
            orderNumber:r.orderNumber,
            userName: r.user?.name || "Unknown",
            date: new Date(r.createdAt).toLocaleString("en-IN"),
            subtotal: r.subtotal || 0,
            discount: r.totalDiscount || 0,
            totalAmount: r.totalAmount || 0,
            paymentMethod: r.paymentMethod || "",
        })
    })

    sheet.addRow({})

    const totalSubtotal = rows.reduce((a,b) => a + (b.subtotal || 0), 0)
    const totalDiscount = rows.reduce((a, b) => a + (b.totalDiscount || 0), 0)
    const grandTotal = rows.reduce((a, b) => a + (b.totalAmount || 0), 0)

    const totalRow = sheet.addRow({
        orderNumber: "TOTAL",
        subtotal: totalSubtotal,
        discount: totalDiscount,
        totalAmount: grandTotal,
    })

    totalRow.font = { bold: true }

    res.setHeader(
        "Content-Disposition",
        `attachment; filename="sales-report-${Date.now()}.xlsx"`
    )

    await workbook.xlsx.write(res)
    res.end()
})

const downloadPdf = asyncHandler( async( req,res) => {
    const {filterType = 'daily', from, to, onlyCompleted} = req.query
    
    const {startDate, endDate} = buildDateRange(filterType, from, to)
    const match = buildMatch(startDate, endDate, {onlyCompleted:onlyCompleted === 'true'})
    match["items.status"] = { $nin: ["CANCELLED", "RETURNED"] }

    const result = await Order.aggregate([
        {$match:match},
        {$facet:{totals:[
            {$group:{_id:null,totalOrders:{$sum:1},totalRevenue:{$sum:{$ifNull:['$totalAmount',0]}},totalDiscount:{$sum:{$ifNull:['$totalDiscount',0]}},},},
        ],
        data:[
            {$sort:{createdAt:-1}},
            {$lookup:{from:'users',localField:'user',foreignField:'_id',as:'user'},},
            {$unwind:{path:'$user',preserveNullAndEmptyArrays:true}},
        ],
    }}
    ])

    const totals = result[0].totals[0] || { totalOrders: 0, totalRevenue: 0, totalDiscount: 0 }
    const orders = result[0].data || []

    const pdfTemplate = path.join(__dirname,'../../views/admin/salesReportPdf.ejs')

    const html = await ejs.renderFile(pdfTemplate, {
        orders,
        totalOrders: totals.totalOrders,
        totalRevenue: totals.totalRevenue,
        totalDiscount: totals.totalDiscount,
        filterType,
        fromDate: from || '',
        toDate: to || '',
    })

    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    })

    const page = await browser.newPage()
    await page.setContent(html,{waitUntil:['load','networkidle0']})

    const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
            top: "20mm",
            right: "10mm",
            bottom: "20mm",
            left: "10mm",
        },
    })

    await browser.close()

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="sales-report-${Date.now()}.pdf"`
    )
    res.setHeader('Content-Length',pdfBuffer.length)

    res.end(pdfBuffer)
})



module.exports = {loadSalesReport,downloadExcel,downloadPdf}
