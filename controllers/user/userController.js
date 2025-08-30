const asyncHandler = require('express-async-handler')
const User = require('../../models/userSchema')
const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')




const loadHome = asyncHandler(async (req,res) =>{
    res.render('user/home',{layout:'layouts/user_main'})
})

const loadProfile = asyncHandler( async (req,res) => {
    const user = await User.findById(req.session.user).lean()

    if(!user) {
        return res.redirect('/auth/login')
    }
    res.render('user/profile',{layout:'layouts/user_main',user})
})

const logoutUser = asyncHandler( async (req,res) => {
    req.session.destroy((err) => {
        if(err) {
            console.error('logout error',err)
            return res.status(httpStatus.internal_server_error).json({success:false,message:messages.AUTH.LOGOUT_FAILED})
        }
        res.clearCookie('connect.sid')
        res.json({success:true,message:messages.AUTH.LOGOUT_SUCCESS})
    })
})





module.exports = {loadHome,loadProfile,logoutUser}