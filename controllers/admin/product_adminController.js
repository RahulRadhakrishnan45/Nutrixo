const messages = require('../../constants/messages')
const httpStatus = require('../../constants/httpStatus')
const Product = require('../../models/productSchema')
const asyncHandler = require('express-async-handler')
const Category = require('../../models/categorySchema')
const Brand = require('../../models/brandSchema')
const {FLAVOURS,SIZES} = require('../../constants/productOptions')




const loadProducts = asyncHandler( async( req,res) => {
    const products = await Product.find().populate('category_id').populate('brand_id').sort({createdAt:-1})

    const categories = await Category.find()
    const brands = await Brand.find()

    
    res.render('admin/productlist',{layout:'layouts/admin_main',products,categories,brands,flavours:FLAVOURS,sizes:SIZES})
})

const loadAddProduct = asyncHandler( async( req,res) => {
    const categories = await Category.find()
    const brands = await Brand.find()

    res.render('admin/addProduct',{layout:'layouts/admin_main',categories,brands,flavours:FLAVOURS,sizes:SIZES})
})

const addProduct = asyncHandler( async( req,res) => {
    console.log(req.body)
    const {title,description,category_id,brand_id,flavour,price,discounted_price,stock,size} = req.body
    console.log(req.files)
    const imagesByVariant = {}
    if(req.files && req.files.length > 0) {
        req.files.forEach(file => {
            const match = file.fieldname.match(/variant_images_(\d+)/)
            if (match) {
                const index = match[1]
                if (!imagesByVariant[index]) imagesByVariant[index] = []
                imagesByVariant[index].push(`/uploads/products/${file.filename}`)
            }
        })
    }
    
    const variants = []
    for(let i = 0; i < size.length; i++) {
        variants.push({
            price:price[i],
            discounted_price:discounted_price[i],
            stock:stock[i],
            size:size[i],
            images:imagesByVariant[i] || []
        })
    }

    const newProduct = new Product({
        title,
        description,
        category_id,
        brand_id,
        flavour,
        variants
    })

    await newProduct.save()

    return res.status(httpStatus.created).json({success:true,message:messages.PRODUCT.PRODUCT_ADD})

})











module.exports = {loadProducts,loadAddProduct,addProduct}