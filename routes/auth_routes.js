const express = require('express')
const router = express.Router()
const authController = require('../controllers/user/auth_userController')



router.get('/signup',authController.loadSignup)
router.post('/signup',authController.signupUser)

router.post('/login',authController.loginUser)
router.get('/login',authController.loadLogin)

router.get('/forgot-password',authController.forgotPassword)
router.get('/reset-password',authController.resetPassword)
router.post('/verify-otp',authController.verifyOtp)
router.get('/otp',authController.loadOtpPage)







module.exports = router