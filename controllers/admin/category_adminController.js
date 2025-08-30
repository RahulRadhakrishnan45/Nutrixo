const Category = require('../../models/categorySchema')
const asyncHandler = require('express-async-handler')
const messages = require('../../constants/messages')
const httpStatus = require('../../constants/httpStatus')


const loadCategories = asyncHandler( async (req,res) => {
    const categories = await Category.find().sort({createdAt:-1})
    res.render('admin/category',{layout:'layouts/admin_main',categories})
})

const addCategory = asyncHandler( async (req,res) => {
    try {const { name, is_active} = req.body

    const exists = await Category.findOne({name:{$regex: new RegExp('^'+name+'$','i')}})

    if(exists) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.CATEGORY.CATEGORY_EXISTS})
    }
    await Category.create({name, is_active:is_active?true:false})

    return res.json({success:true,message:messages.CATEGORY.CATEGORY_ADD})
        }
    catch(err) {
        console.log('add category error',err)
        return res.status(httpStatus.internal_server_error).json({success:false,message:messages.CATEGORY.CATEGORY_ADD_ERROR})
    }
})

const toggleCategory = asyncHandler( async (req,res) => {
    
    const category = await Category.findById(req.params.id)
    
    if(!category) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.CATEGORY.CATEGORY_NOT_FOUND})
    }

    category.is_active = !category.is_active
    await category.save()

    return res.json({success:true, is_active:category.is_active,message:category.is_active?messages.CATEGORY.CATEGORY_LISTED:messages.CATEGORY.CATEGORY_UNLISTED})
})

const editCategory = asyncHandler( async (req,res) => {
    const {name,is_active} = req.body

    const exists = await Category.findOne({_id:{$ne:req.params.id},name:{$regex: new RegExp('^'+name+'$','i')}})
    if(exists){
        return res.status(httpStatus.bad_request).json({success:false,message:messages.CATEGORY.CATEGORY_EXISTS})
    }
    await Category.findByIdAndUpdate(req.params.id, {
        name, is_active: is_active === 'true' || is_active === true
    })
    return res.json({success:true,message:messages.CATEGORY.CATEGORY_UPDATE})
})

const deleteCategory = asyncHandler( async (req,res) => {
    const category = await Category.findById(req.params.id)

    if(!category) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.CATEGORY.CATEGORY_NOT_FOUND})
    }

    category.is_deleted = true
    await category.save()

    return res.json({success:true,message:messages.CATEGORY.CATEGORY_DELETED})
})

const restoreCategory = asyncHandler( async (req,res) => {
    const category = await Category.findById(req.params.id)

    if(!category){
        return res.status(httpStatus.not_found).json({success:false,message:messages.CATEGORY.CATEGORY_NOT_FOUND})
    }

    category.is_deleted = false
    await category.save()

    return res.json({success:true,message:messages.CATEGORY.CATEGORY_RESTORE})
})






module.exports = {loadCategories,addCategory,toggleCategory,editCategory,deleteCategory,restoreCategory}