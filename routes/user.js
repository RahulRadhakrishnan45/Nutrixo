const express = require('express')
const router = express.Router()

router.get('/login',(req,res)=>{
    res.render('auth/login',{isAuthPage:true})
})

router.get('/signup',(req,res)=>{
    res.render('auth/signup',{isAuthPage:true})
})

router.get('/forgot-password',(req,res)=>{
    res.render('auth/forgot-pass',{isAuthPage:true})
})

router.get('/otp',(req,res)=>{
    res.render('auth/otp',{isAuthPage:true})
})

router.get('/reset-password',(req,res)=>{
    res.render('auth/reset-pass',{isAuthPage:true})
})





module.exports = router 