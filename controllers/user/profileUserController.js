const User = require('../../models/userSchema')
const asyncHandler = require('express-async-handler')
const messages = require('../../constants/messages')
const httpStatus = require('../../constants/httpStatus')
const Address = require('../../models/addressSchema')
const { distinct } = require('../../models/productSchema')



const uploadProfileImage = asyncHandler( async( req,res) => {
    const userId = req.session.user._id

    if(!req.file) {
        return res.json({success:false,message:messages.FILE.NO_FILE})
    }

    const imagePath = '/uploads/profiles/' + req.file.filename
    await User.findByIdAndUpdate(userId,{profile_image:imagePath})

    res.json({success:true,image:imagePath,message:messages.PROFILE.PROFILE_IMG_UPDATE})
})

const loadAddress = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    if(!userId) {
        return res.redirect('/auth/login')
    }

    const addresses = await Address.find({user_id:userId}).lean()

    res.render('user/address',{layout:'layouts/user_main',addresses})
})

const addAddress = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    if(!userId) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.USER.USER_NOT_LOGIN})
    }

    const {fullname,mobile,address,district,state,country,pincode} = req.body

    if(!fullname || !mobile || !address || !district || !state || !country || !pincode) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.AUTH.ALL_FIELDS_REQUIRED})
    }

    const addressCount = await Address.countDocuments({user_id:userId})

    const newAddress = new Address({
        user_id:userId,
        fullname,
        mobile,
        address,
        district,
        state,
        country,
        pincode,
        is_Default:addressCount === 0
    })

    await newAddress.save()

    return res.json({success:true,message:messages.ADDRESS.ADDRESS_ADDED})
})

const updateAddress = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    const addressId = req.params.id

    if(!userId) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.USER.USER_NOT_LOGIN})
    }

    const {fullname,mobile,address,district,state,country,pincode} = req.body

    if(!fullname || !mobile || !address || !district || !state || !country || !pincode) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.AUTH.ALL_FIELDS_REQUIRED})
    }

    if(!/^[0-9]{10}$/.test(mobile)) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.AUTH.ENTER_VALID_NO})
    }

    if(!/^[0-9]{6}$/.test(pincode)) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.AUTH.ENTER_VALID_PINCODE})
    }

    const updated = await Address.findOneAndUpdate(
        {_id:addressId,user_id:userId},
        {$set:{fullname,mobile,address,district,state,country,pincode}},
        {new:true, runValidators:true}
    )

    if(!updated) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.ADDRESS.ADDRESS_NOT_FOUND})
    }

    return res.json({success:true,message:messages.ADDRESS.ADDRESS_UPDATED})
})

const deleteAddress = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    const addressId = req.params.id

    if(!userId) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.USER.USER_NOT_FOUND})
    }

    const deleted = await Address.findByIdAndDelete({_id:addressId,user_id:userId})

    if(!deleted) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.ADDRESS.ADDRESS_NOT_FOUND})
    }

    return res.json({success:true,message:messages.ADDRESS.ADDRESS_DELETED})
})

const setDefaultAddress = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    const addressId = req.params.id

    if(!userId) {
        return res.status(httpStatus.unauthorized).json({success:false,message:messages.USER.USER_NOT_FOUND})
    }

    await Address.updateMany({user_id:userId},{$set:{is_Default:false}})

    const updated = await Address.findOneAndUpdate(
        {_id:addressId,user_id:userId},{$set:{is_Default:true}},{new:true}
    )

    if(!updated) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.ADDRESS.ADDRESS_NOT_FOUND})
    }

    return res.json({success:true,message:messages.ADDRESS.DEFAULT_ADDRESS})
})


module.exports ={uploadProfileImage,loadAddress,addAddress,updateAddress,deleteAddress,setDefaultAddress}