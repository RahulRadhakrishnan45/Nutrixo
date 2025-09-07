const asyncHandler = require('express-async-handler')
const User = require('../../models/userSchema')
const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')
const Product = require('../../models/productSchema')
const product = require('../../models/productSchema')
const category = require('../../models/categorySchema')
const brand = require('../../models/brandSchema')




const loadHome = asyncHandler(async (req,res) =>{
    const products = await Product.find().sort({createdAt:-1}).lean()

    let variants = []
    products.forEach(products => {
        products.variants.forEach(variant => {
            variants.push({
                productId:product._id,
                title:product.title,
                description:product.description,
                category:product.category_id,
                brand:product.brand_id,
                flavour:variant.flavour,
                size:variant.size,
                price:variant.price,
                discounted_price:variant.discounted_price,
                images:variant.images,
                stock:variant.stock
            })
        })
    })

    variants = variants.slice(0,4)
    res.render('user/home',{layout:'layouts/user_main',newArrivals:variants})
})

const loadProfile = asyncHandler( async (req,res) => {
    const user = await User.findById(req.session.user).lean()

    if(!user) {
        return res.redirect('/auth/login')
    }
    res.render('user/profile',{layout:'layouts/user_main',user})
})

const logoutUser = asyncHandler( async (req,res) => {
    req.session.destroy((err) => {
        if(err) {
            console.error('logout error',err)
            return res.status(httpStatus.internal_server_error).json({success:false,message:messages.AUTH.LOGOUT_FAILED})
        }
        res.clearCookie('connect.sid')
        res.json({success:true,message:messages.AUTH.LOGOUT_SUCCESS})
    })
})

const loadProducts = asyncHandler( async( req,res) => {
    const page = parseInt(req.query.page) || 1
    const limit = 9

    const dbProducts = await Product.find().populate('brand_id','name is_active is_delete').populate('category_id','name is_active is_deleted')
    
    const products = []
    dbProducts.forEach(p => {

        if(!p.brand_id?.is_active || !p.category_id?.is_active) {
            return
        }
        p.variants.filter(v => v.is_active).forEach(v => {
            products.push({
              name: `${p.title} ${v.flavour || ""} ${v.size || ""}`,
              brand: p.brand_id?.name || "Unknown",
              category: p.category_id?.name || "Uncategorized",
              image: v.images?.length > 0 ? v.images[0] : "/images/no-image.png",
              original_price: v.price,
              discounted_price: v.discounted_price || v.price,
              stock: v.stock  
            })
        })
    })

    const totalVariants = products.length
    const totalPages = Math.ceil(totalVariants / limit)

    const start = (page - 1) * limit
    const end = start + limit
    const paginatedVariants = products.slice(start,end)
    res.render('user/product',{layout:'layouts/user_main',products:paginatedVariants,currentPage:page,totalPages})
})





module.exports = {loadHome,loadProfile,logoutUser,loadProducts}