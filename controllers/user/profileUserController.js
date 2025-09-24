const User = require('../../models/userSchema')
const asyncHandler = require('express-async-handler')
const messages = require('../../constants/messages')
const Address = require('../../models/addressSchema')



const uploadProfileImage = asyncHandler( async( req,res) => {
    const userId = req.session.user._id

    if(!req.file) {
        return res.json({success:false,message:messages.FILE.NO_FILE})
    }

    const imagePath = '/uploads/profiles/' + req.file.filename
    await User.findByIdAndUpdate(userId,{profile_image:imagePath})

    res.json({success:true,image:imagePath,message:messages.PROFILE.PROFILE_IMG_UPDATE})
})

const removeProfileImage = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    await User.findByIdAndUpdate(userId,{profile_image:null})

    res.json({success:true,message:messages.PROFILE.PROFILE_IMG_DELETE})
})

const loadAddress = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    if(!userId) {
        return res.redirect('/auth/login')
    }

    const addresses = await Address.find({user_id:userId}).lean()

    res.render('user/address',{layout:'layouts/user_main',addresses})
})



module.exports ={uploadProfileImage,removeProfileImage,loadAddress}