const express = require('express')
const router = express.Router()

router.get('/login',(req,res)=>{
    res.render('admin/login',{layout:'adminLogin'})
})

router.get('/dashboard',(req,res)=>{
    res.render('admin/dashboard',{layout:admin_main})
})






module.exports = router