const express = require('express')
const router = express.Router()

router.get('/login',(req,res)=>{
    res.render('admin/login',{isAdmin:true,isAdminLogin:true})
})

router.get('/dashboard',(req,res)=>{
    res.render('admin/dashboard',{isAdmin:true})
})






module.exports = router