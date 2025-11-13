const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const asyncHandler = require('express-async-handler')
const User = require('../../models/userSchema')
const Admin = require('../../models/adminSchema')
const Order = require('../../models/orderSchema')
const Product = require('../../models/productSchema')
const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')




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
    req.session.destroy(err => {
        if(err) {
            console.log('Logout error',err)
            return res.status(httpStatus.internal_server_error).send(messages.AUTH.LOGOUT_FAILED)
        }
        res.clearCookie('connect.sid')
        res.redirect('/admin/login?logout=1')
    })
})

const loadDashboard = asyncHandler( async (req,res) => {
    const message = req.session.message
    delete req.session.message

    const revenueResult = await Order.aggregate([
        {$match:{'items.status':{$nin:['CANCELLED','RETURNED']},},},
        {$group:{_id:null,totalRevenue:{$sum:'$totalAmount'},},}
    ])

    const totalRevenue = revenueResult[0]?.totalRevenue || 0
    const totalOrders = await Order.countDocuments()
    const totalCustomers = await User.countDocuments()

    const salesOverview = await Order.aggregate([
        {$match:{createdAt:{$gte:new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)},'items.status':{$nin:['CANCELLED','RETURNED']},},},
        {$group:{_id:{$dayOfWeek:'$createdAt'},total:{$sum:'$totalAmount'},},},{$sort:{'_id':1}},
    ])

    const bestSellingProducts = await Order.aggregate([
        {$unwind:{path:'$items'}},{$match:{'items.status':{$nin:['CANCELLED','RETURNED']},},},
        {$group:{_id:'$items.product',totalSold:{$sum:'$items.quantity'},},},
        {$sort:{totalSold:-1}},
        {$limit:5},
        {$lookup:{
            from:'products',
            localField:'_id',
            foreignField:'_id',
            as:'product',
        },},
        {$unwind:{path:'$product',preserveNullAndEmptyArrays:true}},
        {$project:{_id:1,totalSold:1,name:'$product.title',image:{$arrayElemAt:[{$arrayElemAt:['$product.variants.images',0],},0,],},},},
    ])

    const recentOrders = await Order.find({}).populate('user','name').sort({createdAt:-1}).limit(5).lean()
    recentOrders.forEach(order => {
        const statuses = order.items.map(item => item.status)
        if(statuses.every(s => s === 'DELIVERED')) order.status ='DELIVERED'
        else if (statuses.some(s => s === 'PROCESSING')) order.status = 'PROCESSING'
        else if (statuses.some(s => s === 'CANCELLED')) order.status = 'CANCELLED'
        else order.status = statuses[0] || 'PENDING'
    })

    res.render('admin/dashboard',{layout:'layouts/admin_main',message,totalRevenue,totalOrders,totalCustomers,salesOverview,bestSellingProducts,recentOrders})
})


module.exports = {loadLogin,login,logout,loadDashboard}
