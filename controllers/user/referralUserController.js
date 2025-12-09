const asyncHandler = require('express-async-handler')
const User = require('../../models/userSchema')
const messages = require('../../constants/messages')
const httpStatus = require('../../constants/httpStatus')
const {creditToWallet} = require('../../utils/walletRefund')

const loadReferralPage = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    const user = await User.findById(userId)

    if(!user) return res.redirect('/auth/login')

    const referralCode = user.referralCode
    const usedReferralCode = user.referredBy

    const totalReferrals = await User.countDocuments({referredBy:userId})

    const earningPerReferral = 100
    const totalEarnings = totalReferrals * earningPerReferral

    res.render('user/referral',{layout:'layouts/user_main',referralCode,usedReferralCode,totalReferrals,totalEarnings})
})

const applyReferralCode = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    const {referralCode} = req.body
    
    if(!userId) {
        return res.status(httpStatus.unauthorized).json({success:false,message:messages.AUTH.LOGIN_REQUIRED})
    }
    if(!referralCode) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.REFERRAL.REFERRAL_CODE_REQUIRED})
    }

    const user = await User.findById(userId)

    const joinedAt = user.createdAt
    const now = new Date()

    const diffInMs = now - joinedAt
    const diffInDays = diffInMs / (1000 * 60 * 24)

    if(diffInDays > 2) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.REFERRAL.REFERRAL_DAYS_EXHAUSTED})
    }

    if(user.referralClaimed) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.REFERRAL.REFERRAL_EXISTS})
    }

    if(user.referralCode === referralCode) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.REFERRAL.OWN_REFERRAL})
    }

    const referrer = await User.findOne({referralCode})
    if(!referrer) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.REFERRAL.INVALID_REFERRAL})
    }

    await creditToWallet(userId,50,"Referral applied! ₹50 added to your wallet.")
    await creditToWallet(referrer._id,100,"Referral bonus credited. ₹100 added to your wallet")

    user.referralClaimed = true
    user.referredBy = referrer._id
    await user.save()

    return res.status(httpStatus.ok).json({success:true,message:messages.REFERRAL.REFERRAL_APPLIED,userBonus:50,referrerBonus:100})
})


module.exports= {loadReferralPage,applyReferralCode}
