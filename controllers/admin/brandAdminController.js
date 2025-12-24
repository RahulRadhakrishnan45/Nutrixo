const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')
const Brand = require('../../models/brandSchema')
const asyncHandler = require('express-async-handler')



const loadBrands = asyncHandler( async (req,res) => {
    const brands = await Brand.find().sort({createdAt:-1})
    res.render('admin/brand',{layout:'layouts/admin_main',brands})
})

const addBrand = asyncHandler( async( req,res) => {
    const {name} = req.body
    const logo_url = req.file ? req.file.path : ''

    const exists =await Brand.findOne({name:{$regex: new RegExp('^'+name+'$','i')}})
    
    if(exists) {
        return res.json({success:false,message:messages.BRAND.BRAND_EXISTS})
    }

    await Brand.create({name,logo_url})
    res.json({success:true,message:messages.BRAND.BRAND_ADD})
})

const toggleBrand = asyncHandler( async( req,res) => {
    const brand = await Brand.findById(req.params.id)

    if(!brand) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.BRAND.BRAND_NOT_FOUND})
    }

    if(brand.is_delete) {
        return res.json({success:false,message:'cannot change the status of a deleted brand'})
    }

    brand.is_active = !brand.is_active
    await brand.save()

    const msg = brand.is_active ? messages.BRAND.BRAND_ACTIVATED : messages.BRAND.BRAND_BLOCKED

    res.json({success:true,message:msg,is_active:brand.is_active})
})

const deleteBrand = asyncHandler( async( req,res) => {
    const brand = await Brand.findById(req.params.id)

    if(!brand) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.BRAND.BRAND_NOT_FOUND})
    }

    brand.is_delete = true
    brand.is_active = false
    await brand.save()

    res.json({success:true,message:messages.BRAND.BRAND_DELETED})
})

const restoreBrand = asyncHandler( async( req,res) => {
    const brand = await Brand.findById(req.params.id)
    
    if(!brand) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.BRAND.BRAND_NOT_FOUND})
    }

    brand.is_delete = false
    brand.is_active = true
    await brand.save()

    res.json({success:true,message:messages.BRAND.BRAND_RESTORED})
})


module.exports = {loadBrands,addBrand,toggleBrand,deleteBrand,restoreBrand}
