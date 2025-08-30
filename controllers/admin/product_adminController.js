const messages = require('../../constants/messages')
const httpStatus = require('../../constants/httpStatus')
const Product = require('../../models/productSchema')
const asyncHandler = require('express-async-handler')
const Category = require('../../models/categorySchema')
const Brand = require('../../models/brandSchema')




const loadProducts = asyncHandler( async( req,res) => {
    const products = await Product.find().populate('category').populate('brand').sort({createdAt:-1})

    const categories = await Category.find()
    const brands = await Brand.find()

    let flavours = []
    let sizes =[]

    products.forEach(products => {
        products.variants.forEach(v => {
            if(v.flavour && !flavour.includes(v.flavour)) {
                flavours.push(v.flavour)
            }
            if(v.size && !size.includes(v.size)) {
                sizes.push(v.size)
            }
        })
    })
    res.render('admin/productlist',{layout:'layouts/admin_main',products,categories,brands,flavours,sizes})
})











module.exports = {loadProducts}