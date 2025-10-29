const asyncHandler = require('express-async-handler')
const User = require('../../models/userSchema')
const Order = require('../../models/orderSchema')
const messages = require('../../constants/messages')
const httpStatus = require('../../constants/httpStatus')


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


module.exports = {loadOrders}