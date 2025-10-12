const asyncHandler = require('express-async-handler')
const User = require('../../models/userSchema')
const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')
const bcrypt = require('bcrypt')
const {apiLog} = require('../../config/logger')


const loadChangePassword = asyncHandler( async( req,res) => {
    if(!req.session.user) {
        return res.redirect('/auth/login')
    }
    const user = await User.findById(req.session.user._id)
    res.render('user/password',{layout:'layouts/user_main',title:'change password',isGoogleUser:!!user.googleId})
})

const postChangePassword = asyncHandler( async( req,res) => {
    const {currentPassword,newPassword,confirmPassword} = req.body
    const userId = req.session.user._id

    if(!req.session.user || !req.session.user._id) {
        return res.status(httpStatus.unauthorized).json({success:false,message:messages.AUTH.SESSION_EXPIRED})
    }

    const user = await User.findById(userId)

    if(!user) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.AUTH.USER_NOT_FOUND})
    }

    if(user.googleId) {
        if(newPassword !== confirmPassword) {
            return res.status(httpStatus.bad_request).json({success:false,message:messages.AUTH.PASSWORD_MISMATCH})
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        user.password = hashedPassword
        await user.save()

        return res.json({success:true,message:messages.AUTH.PASSWORD_CREATED,redirect:'/profile'})
    }

    const isMatch = await bcrypt.compare(currentPassword,user.password)
    if(!isMatch) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.AUTH.PASSWORD_OLD_ERROR})
    }

    if(newPassword !== confirmPassword) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.AUTH.PASSWORD_MISMATCH})
    }

    const isSame = await bcrypt.compare(newPassword,user.password)
    if(isSame) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.AUTH.PASSWORD_SAME})
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    user.password = hashedPassword
    await user.save()

    return res.json({success:true,message:messages.AUTH.PASSWORD_RESET_SUCCESS,redirect:'/profile'})
})


module.exports = {loadChangePassword,postChangePassword}