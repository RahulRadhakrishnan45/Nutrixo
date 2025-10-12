const mongoose = require('mongoose')
const asyncHandler = require('express-async-handler')
const User = require('../../models/userSchema')
const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')




const loadCustomers = asyncHandler( async( req,res) => {
    let page = parseInt(req.query.page) || 1
    let limit = 6
    let skip = (page - 1) * limit

    const totatUsers = await User.countDocuments()

    const users = await User.find().sort({createdAt:-1}).skip(skip).limit(limit)

    res.render('admin/customer',{layout:'layouts/admin_main',users,currentPage:page,totalPages:Math.ceil(totatUsers / limit),query:req.query || {}})
})

const blockCustomers = asyncHandler( async( req,res) => {
    const {userId} = req.params

    const user = await User.findById(userId)
    if(!user) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.USER.USER_NOT_FOUND})
    }

    user.is_active = !user.is_active
    await user.save()

    res.json({success:true,message:user.is_active?messages.USER.USER_UNBLOCKED : messages.USER.USER_BLOCKED,is_active:user.is_active,userId:user._id})

})

const searchCustomers = asyncHandler(async (req, res) => {
  const q = req.query.q?.trim();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;
  const skip = (page - 1) * limit;

  let queryObj = {};
  if (q) {
    const regex = new RegExp(q, "i");
    queryObj = { $or: [{ name: regex }, { email: regex }, { mobile: regex }] };
  }

  const totalUsers = await User.countDocuments(queryObj);
  const users = await User.find(queryObj).sort({ createdAt: -1 }).skip(skip).limit(limit);

  res.json({ success: true, users, totalPages: Math.ceil(totalUsers / limit), currentPage: page });
});















module.exports = {loadCustomers,blockCustomers,searchCustomers}