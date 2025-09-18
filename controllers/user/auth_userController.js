
const User = require('../../models/userSchema')
const asyncHandler = require('express-async-handler')
const bcrypt = require('bcrypt')
const env = require('dotenv').config()
const { generateOtp, sendVerificationEmail} = require('../../utils/generator')
const user = require('../../models/userSchema')
const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')



const loadLogin = asyncHandler(async (req,res) =>{
    const message = req.session.message;
    if(req.session.user) return res.redirect('/');
    res.render('auth/login',{message,layout:'layouts/userLogin'})
})



const loadSignup = asyncHandler(async (req,res) =>{
    res.render('auth/signup',{layout:'layouts/userLogin'})
})

const forgotPassword = asyncHandler(async (req,res) =>{
    res.render('auth/forgot-pass',{layout:'layouts/userLogin'})
})

const sendResetMail = asyncHandler( async(req,res) =>{
    const {email} = req.body
    console.log(email)
    const findUser = await User.findOne({email})
    
    if(findUser){
        const otp = generateOtp()
        const emailSent = await sendVerificationEmail(email,otp)

        if(!emailSent) {
        return res.status(httpStatus.internal_server_error).json({success:false,message:messages.OTP.FAILED})
        }

        req.session.userOtp = otp
        req.session.otpExpiry = Date.now() + 2*60*1000
        req.session.email = email
        req.session.purpose = 'forgot-password'

        
        console.log('otp sent',otp)

        return res.json({success:true, message:messages.OTP.SENT,redirect:'/auth/otp'})
    }else{
        return res.status(httpStatus.not_found).json({success:false,message:messages.AUTH.USER_NOT_FOUND,redirect:'/auth/signup'})
    }
})

const resetPassword = asyncHandler(async (req,res) =>{
    res.render('auth/reset-pass',{layout:'layouts/userLogin'})
})

const postResetPassword = asyncHandler(async (req,res) =>{
    const {newPass,confirmPass} = req.body
    const email = req.session.verifiedEmail

    if(!email){
        return res.status(httpStatus.bad_request).json({success:false,message:messages.AUTH.SESSION_EXPIRED})
    }

    if(newPass !== confirmPass){
        return res.status(httpStatus.bad_request).json({success:false,message:messages.AUTH.PASSWORD_MISMATCH})
    }

    const passwordHash = await securePassword(newPass)

    const updateUser = await User.findOneAndUpdate({email},{password:passwordHash},{new:true})

    if(!updateUser){
        return res.status(httpStatus.not_found).json({success:false,message:messages.AUTH.USER_NOT_FOUND})
    }

    req.session.verifiedEmail = null

    return res.json({success:true,message:messages.AUTH.PASSWORD_RESET_SUCCESS,redirect:'/auth/login'})
})

const loadOtpPage = asyncHandler(async (req,res)=>{
    if(!req.session.userOtp || !req.session.purpose) {
        return res.redirect('/auth/signup')
    }

    const expiry = req.session.otpExpiry
    res.render('auth/otp',{layout:'layouts/userLogin',expiry})
})

const loginUser = asyncHandler(async (req,res) => {
    const {email,password} = req.body

    const user = await User.findOne({email})
    if(!user) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.AUTH.USER_NOT_FOUND})
    }

    if(!user.is_active) {
        return res.status(httpStatus.forbidden).json({success:false,message:messages.AUTH.ACCOUNT_BLOCKED})
    }

    const isMatch = await bcrypt.compare(password,user.password)
    if(!isMatch) {
        return res.status(httpStatus.bad_request).json({success:false, message:messages.AUTH.PASSWORD_INVALID})
    }

    req.session.user = user._id

    return res.json({success:true, message:messages.AUTH.LOGIN_SUCCESS,redirect:'/'})
})

const signupUser = asyncHandler( async (req,res) =>{
    const { name, email, password, confirmPassword, mobile} = req.body
    
    if(!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || !mobile.trim()) {

        return res.redirect('/auth/signup')
    }
    if(password !== confirmPassword){
        return res.redirect('/auth/signup')
    }

    const emailExists = await User.findOne({email})
    if(emailExists) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.USER.USER_EXISTS})
    }

    const mobileExists = await User.findOne({mobile})
    
    if(mobileExists) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.USER.USER_MOB_EXISTS})
    }

    const otp = generateOtp()
    const otpExpiry = Date.now() + 2*60*1000

    const emailSent = await sendVerificationEmail(email,otp)

    if(!emailSent) {
        return res.status(httpStatus.internal_server_error).json({success:false,message:messages.OTP.FAILED})
    }

    req.session.userOtp = otp
    req.session.otpExpiry = otpExpiry
    req.session.userData = {name,email,password,mobile}
    req.session.purpose = 'signup'

    console.log('otp sent',otp)

    return res.json({success:true,message:messages.OTP.SENT,redirect:'/auth/otp'})
})

const securePassword = async (password) =>{
    const passwordHash = await bcrypt.hash(password,10)
    return passwordHash
}

const verifyOtp = asyncHandler(async (req,res) =>{
    const {otp} =req.body
    console.log(otp)

    if(Date.now() > req.session.otpExpiry) {
        return res.status(httpStatus.bad_request).json({success:false, message:messages.OTP.EXPIRED})
    }

   if(parseInt(otp) === parseInt(req.session.userOtp)) {
        if (req.session.purpose === 'signup') {
            
            const user = req.session.userData
            const passwordHash = await securePassword(user.password)

            const saveUserData = new User({
                name:user.name,
                email:user.email,
                mobile:user.mobile,
                password:passwordHash
            })
            await saveUserData.save()

            
            req.session.userOtp = null
            req.session.userData = null
            req.session.otpExpiry = null
            req.session.purpose = null

            return res.json({
                success:true,
                message:messages.AUTH.SIGNUP_SUCCESS,
                redirect:'/auth/login'
            })

        } else if (req.session.purpose === 'forgot-password') {
            
            req.session.verifiedEmail = req.session.email

            
            req.session.userOtp = null
            req.session.otpExpiry = null
            req.session.purpose = null

            return res.json({
                success:true,
                message:messages.OTP.VERIFIED,
                redirect:'/auth/reset-password'
            })

        } else {
            
            return res.status(httpStatus.bad_request).json({
                success:false,
                message:messages.OTP.INVALID_PURPOSE
            })
        }

    } else {
        return res.status(httpStatus.bad_request).json({
            success:false, 
            message:messages.OTP.VERIFICATION_FAILED
        })
    }
})

const resendOtp = asyncHandler(async (req,res)=>{

        let email = null;

        if (req.session.purpose === 'signup' && req.session.userData) {
        email = req.session.userData.email
        }else if (req.session.purpose === 'forgot-password' && req.session.email) {
        email = req.session.email
        }
        console.log(email)
        if(!email){
            return res.status(httpStatus.bad_request).json({success:false, message:messages.OTP.EMAIL_NOT_FOUND})
        }
        
        const otp = generateOtp()
        req.session.otpExpiry = Date.now() + 2*60*1000
        req.session.userOtp = otp

        const emailSent = await sendVerificationEmail(email,otp)
        if(emailSent){
            console.log('Resend otp:',otp)
            res.status(httpStatus.ok).json({success:true,message:messages.OTP.RESENT,expiry:req.session.otpExpiry})
        }else{
            console.log('OTP resend failed')
            res.status(httpStatus.internal_server_error).json({success:false,message:messages.OTP.RESEND_FAILED})
        }
})

module.exports = {loadSignup,loadLogin,loginUser,forgotPassword,resetPassword,signupUser,verifyOtp,loadOtpPage,resendOtp,sendResetMail,postResetPassword}