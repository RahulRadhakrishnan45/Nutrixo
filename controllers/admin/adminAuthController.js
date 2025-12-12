const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const asyncHandler = require('express-async-handler')
const User = require('../../models/userSchema')
const Admin = require('../../models/adminSchema')
const Order = require('../../models/orderSchema')
const Product = require('../../models/productSchema')
const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')
const {buildDashboardResponse} = require('../../utils/dashboardHelper')



const loadLogin = asyncHandler(async (req,res) => {
    let message = req.session.message
    delete req.session.message

    if(req.query.logout ==='1'){
        message = {type:'success',text:messages.AUTH.LOGOUT_SUCCESS}
    }

    if(req.session.admin) {
        return res.redirect('/admin/dashboard')
    }
    res.render('admin/login',{layout:'layouts/adminLogin',message})
})

const login = asyncHandler( async (req,res) => {
    const {email,password} = req.body
    const admin = await Admin.findOne({email})

    if(!admin) {
        req.session.message = {type:'error',text:messages.ADMIN.INVALID_EMAIL}
        return res.status(httpStatus.bad_request).render('admin/login',{layout:'layouts/adminLogin',message:{type:'error',text:messages.ADMIN.INVALID_EMAIL}})
    }

    const passwordMatch = await bcrypt.compare(password,admin.password)

    if(!passwordMatch) {
        req.session.message = {type:'error', text:messages.ADMIN.INVALID_PASSWORD}
        return res.status(httpStatus.bad_request).render('admin/login',{layout:'layouts/adminLogin',message:{type:'error',text:messages.ADMIN.INVALID_PASSWORD}})
    }
    req.session.admin = admin._id
    req.session.message = {type:'success',text:messages.ADMIN.WELCOME}

    return res.redirect('/admin/dashboard')
})

const logout = asyncHandler( async (req,res) => {
    delete req.session.admin

    req.session.save(err => {
        if(err) {
            console.log('Admin logout error',err)
            return res.status(httpStatus.internal_server_error).send(messages.AUTH.LOGOUT_FAILED)
        }

        return res.redirect('/admin/login?logout=1')
    })
})

const loadDashboard = asyncHandler( async( req,res) => {
    const message = req.session.message
    delete req.session.message

    res.render('admin/dashboard',{layout:'layouts/admin_main',message})
})

const dashboardDetails = asyncHandler( async (req,res) => {
    const period = req.query.timeFilter || 'monthly'
    const now = new Date()
    let startDate 
    let labels = []
    let data = []

    if(period === 'daily') {
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)

        const dailySeries = await Order.aggregate([
            {$unwind:'$items'},
            {$match:{createdAt:{$gte:startDate},showInOrders:true,'items.status':{$nin:['CANCELLED','RETURNED']}}},
            {$group:{_id:{$hour:'$createdAt'},total:{$sum:'$totalAmount'}}},
            {$sort:{_id:1}}
        ])

        labels = Array.from({length:24},(_,i) => i)
        data = labels.map(h => dailySeries.find(x => x._id === h)?.total || 0)

    }else if (period === 'weekly') {
        const day = now.getDay()
        startDate = new Date()
        startDate.setDate(now.getDate() - day)
        startDate.setHours(0, 0 ,0 ,0)

        const weeklySeries = await Order.aggregate([
            {$unwind:'$items'},
            {$match:{createdAt:{$gte:startDate},showInOrders: true,'items.status':{$nin:['CANCELLED','RETURNED']}}},
            {$group:{_id:{$dayOfWeek:'$createdAt'},total:{$sum:'$totalAmount'}}},
            {$sort:{_id:1}}
        ])

        labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        data = labels.map((_, i) => weeklySeries.find(x => x._id === i + 1)?.total || 0)

    }else if (period === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        const daysInMonth = new Date(now.getFullYear(),now.getMonth() + 1, 0).getDate()

        const monthlySeries = await Order.aggregate([
            {$unwind:'$items'},
            {$match:{createdAt:{$gte:startDate},showInOrders: true,'items.status':{$nin:['CANCELLED','RETURNED']}}},
            {$group:{_id:{$dayOfMonth:'$createdAt'},total:{$sum:'$totalAmount'}}},
            {$sort:{_id:1}}
        ])

        labels = Array.from({length:daysInMonth},(_, i) => i + 1)
        data = labels.map(day => monthlySeries.find(x => x._id === day)?.total || 0)

    }else if (period === 'yearly') {
        startDate = new Date(now.getFullYear(), 0, 1)

        const yearlySeries = await Order.aggregate([
            {$unwind:'$items'},
            {$match:{createdAt:{$gte:startDate},showInOrders: true,'items.status':{$nin:['CANCELLED','RETURNED']}}},
            {$group:{_id:{$month:'$createdAt'},total:{$sum:'$totalAmount'}}},
            {$sort:{_id:1}}
        ])

        labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
        data = labels.map((_, i) => yearlySeries.find(x => x._id === i + 1)?.total || 0)
    }

    const dashboardData = await buildDashboardResponse(startDate)

    dashboardData.timeSeriesLabels = labels
    dashboardData.timeSeriesData = data

    return res.json(dashboardData)
})


module.exports = {loadLogin,login,logout,dashboardDetails,loadDashboard}
