
const User = require('../../models/userSchema')
const asyncHandler = require('express-async-handler')
const bcrypt = require('bcrypt')
const env = require('dotenv').config()
const { generateOtp, sendVerificationEmail} = require('../../helper_files/generator')



const loadLogin = asyncHandler(async (req,res) =>{
    if(req.session.user) return res.redirect('/');
    res.render('auth/login',{layout:'layouts/userLogin'})
})

const loadHome = asyncHandler(async (req,res) =>{
    res.render('user/home',{layout:'layouts/user_main'})
})

const loadSignup = asyncHandler(async (req,res) =>{
    res.render('auth/signup',{layout:'layouts/userLogin'})
})

const forgotPassword = asyncHandler(async (req,res) =>{
    res.render('auth/forgot-pass',{layout:'layouts/userLogin'})
})

const resetPassword = asyncHandler(async (req,res) =>{
    res.render('auth/reset-pass',{layout:'layouts/userLogin'})
})

const loadOtpPage = asyncHandler(async (req,res)=>{
    if(!req.session.userOtp || !req.session.userData) {
        return res.redirect('/auth/signup')
    }
    res.render('auth/otp',{layout:'layouts/userLogin'})
})

const loginUser = asyncHandler(async (req,res) => {
    const {email,password} = req.body

    const user = await User.findOne({email})
    if(!user) {
        return res.status(400).json({success:false,message:'Invalid email'})
    }

    const isMatch = await bcrypt.compare(password,user.password)
    if(!isMatch) {
        return res.status(400).json({success:false, message:'Password doesnot match'})
    }

    req.session.user = user._id

    return res.json({success:true, message:'Login successful',redirect:'/'})
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
        res.json('User already exists')
        return res.redirect('/auth/signup')
    }

    const mobileExists = await User.findOne({mobile})
    
    if(mobileExists) {
        return res.json('Number already exists')
    }

    const otp = generateOtp()
    const otpExpiry = Date.now() + 2*60*1000

    const emailSent = await sendVerificationEmail(email,otp)

    if(!emailSent) {
        return res.status(500).json({success:false,message:'Email send failed'})
    }

    req.session.userOtp = otp
    req.session.otpExpiry = otpExpiry
    req.session.userData = {name,email,password,mobile}

    res.redirect('/auth/otp')
    console.log('otp sent',otp)

})

const securePassword = async (password) =>{
    const passwordHash = await bcrypt.hash(password,10)
    return passwordHash
}

const verifyOtp = asyncHandler(async (req,res) =>{
    const {otp} =req.body
    console.log(otp)

    if(Date.now() > req.session.otpExpiry) {
        return res.status(400).json({success:false, message:'OTP has expired. Please try again. '})
    }

    if(otp===req.session.userOtp) {
        const user = req.session.userData
        const passwordHash = await securePassword(user.password)

        const saveUserData = new User({
            name:user.name,
            email:user.email,
            mobile:user.mobile,
            password:passwordHash
        })
        console.log(user)
        await saveUserData.save()
        

        req.session.userOtp = null
        req.session.userData = null
        req.session.otpExpiry = null

        res.json({success:true,message:'signup successfull', redirect:'/auth/login'})
        
    }else{
        console.log('otp verification failed')
        res.status(400).json({success:false, message:'OTP Verification failed, Please try again'})

    }
})

module.exports = {loadSignup,loadLogin,loadHome,loginUser,forgotPassword,resetPassword,signupUser,verifyOtp,loadOtpPage}