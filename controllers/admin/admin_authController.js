const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const asyncHandler = require('express-async-handler')
const User = require('../../models/userSchema')
const Admin = require('../../models/adminSchema')




const loadLogin = asyncHandler(async (req,res) => {
    let message = req.session.message
    delete req.session.message

    if(req.query.logout ==='1'){
        message = {type:'success',text:'Logged out successfully'}
    }

    if(req.session.admin) {
        return res.redirect('/admin/dashboard')
    }
    res.render('admin/login',{layout:'layouts/adminLogin',message})
})

const login = asyncHandler( async (req,res) => {
    const {email,password} = req.body
    const admin = await Admin.findOne({email})

    if(!admin) {
        req.session.message = {type:'error',text:'Invalid email or password'}
        return res.status(400).render('admin/login',{layout:'layouts/adminLogin',message:{type:'error',text:'Invalid email'}})
    }

    const passwordMatch = await bcrypt.compare(password,admin.password)

    if(!passwordMatch) {
        req.session.message = {type:'error', text:'Invalid password'}
        return res.status(400).render('admin/login',{layout:'layouts/adminLogin',message:{type:'error',text:'Invalid password'}})
    }
    req.session.admin = admin._id
    req.session.message = {type:'success',text:'Welcome back Admin'}

    return res.redirect('/admin/dashboard')
})

const logout = asyncHandler( async (req,res) => {
    req.session.destroy(err => {
        if(err) {
            console.log('Logout error',err)
            return res.status(500).send('logout failed')
        }
        res.clearCookie('connect.sid')
        res.redirect('/admin/login?logout=1')
    })
})

const loadDashboard = asyncHandler( async (req,res) => {
    const message = req.session.message
    delete req.session.message

    res.render('admin/dashboard',{layout:'layouts/admin_main',message})
})








module.exports = {loadLogin,login,logout,loadDashboard}