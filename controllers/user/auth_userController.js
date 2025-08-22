
const User = require('../../models/userSchema')
const asyncHandler = require('express-async-handler')
const bcrypt = require('bcrypt')
const env = require('dotenv').config()
const { generateOtp, sendVerificationEmail} = require('../../utils/generator')
const user = require('../../models/userSchema')



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
        return res.status(500).json({success:false,message:'Email send failed'})
        }

        req.session.userOtp = otp
        req.session.otpExpiry = Date.now() + 2*60*1000
        req.session.email = email
        req.session.purpose = 'forgot-password'

        
        console.log('otp sent',otp)

        return res.json({success:true, message:'OTP sent successfully',redirect:'/auth/otp'})
    }else{
        return res.status(404).json({success:false,message:'User not found. Please sign up',redirect:'/auth/signup'})
    }
})

const resetPassword = asyncHandler(async (req,res) =>{
    res.render('auth/reset-pass',{layout:'layouts/userLogin'})
})

const postResetPassword = asyncHandler(async (req,res) =>{
    const {newPass,confirmPass} = req.body
    const email = req.session.verifiedEmail

    if(!email){
        return res.status(400).json({success:false,message:'Session expired. please try again'})
    }

    if(newPass !== confirmPass){
        return res.status(400).json({success:false,message:'Passwords do not match'})
    }

    const passwordHash = await securePassword(newPass)

    const updateUser = await User.findOneAndUpdate({email},{password:passwordHash},{new:true})

    if(!updateUser){
        return res.status(404).json({success:false,message:'user not found'})
    }

    req.session.verifiedEmail = null

    return res.json({success:true,message:'Password reset successful',redirect:'/auth/login'})
})

const loadOtpPage = asyncHandler(async (req,res)=>{
    if(!req.session.userOtp || !req.session.purpose) {
        return res.redirect('/auth/signup')
    }
    res.render('auth/otp',{layout:'layouts/userLogin'})
})

const loginUser = asyncHandler(async (req,res) => {
    const {email,password} = req.body

    const user = await User.findOne({email})
    if(!user) {
        return res.status(400).json({success:false,message:'User does not exist'})
    }

    if(!user.is_active) {
        return res.status(403).json({success:false,message:'Your account has been blocked by the admin'})
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
    req.session.purpose = 'signup'

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
                message:'Signup successful',
                redirect:'/auth/login'
            })

        } else if (req.session.purpose === 'forgot-password') {
            
            req.session.verifiedEmail = req.session.email

            
            req.session.userOtp = null
            req.session.otpExpiry = null
            req.session.purpose = null

            return res.json({
                success:true,
                message:'OTP verified. Redirecting...',
                redirect:'/auth/reset-password'
            })

        } else {
            
            return res.status(400).json({
                success:false,
                message:'Invalid OTP purpose. Please restart the process.'
            })
        }

    } else {
        return res.status(400).json({
            success:false, 
            message:'OTP Verification failed, Please try again'
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
            return res.status(400).json({success:false, message:'email not found in session'})
        }
        
        const otp = generateOtp()
        req.session.otpExpiry = Date.now() + 2*60*1000
        req.session.userOtp = otp

        const emailSent = await sendVerificationEmail(email,otp)
        if(emailSent){
            console.log('Resend otp:',otp)
            res.status(200).json({success:true,message:'OTP Resend successfully'})
        }else{
            console.log('OTP resend failed')
            res.status(500).json({success:false,message:'failed to resend OTP. Please try again'})
        }
})

module.exports = {loadSignup,loadLogin,loginUser,forgotPassword,resetPassword,signupUser,verifyOtp,loadOtpPage,resendOtp,sendResetMail,postResetPassword}