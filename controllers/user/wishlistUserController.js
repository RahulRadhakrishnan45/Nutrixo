const asyncHandler = require('express-async-handler')
const Wishlist = require('../../models/wishlistSchema')
const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')
const Product = require('../../models/productSchema')
const { trusted } = require('mongoose')


const addToWishlist = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    const variantId = req.params.variantId

    if(!userId) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.AUTH.USER_NOT_FOUND})
    }

    const product = await Product.findOne({'variants._id':variantId},{_id:1})
    if(!product) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.PRODUCT.PRODUCT_NOT_FOUND})
    }

    let wishlist = await Wishlist.findOne({user_id:userId})
    if(!wishlist) {
        wishlist = new Wishlist({
            user_id:userId,
            items:[{product_id:product._id,variant_id:variantId}],
        })
    }else{
        const alreadyAdded = wishlist.items.some(item => item.variant_id.toString() === variantId.toString())
        if(alreadyAdded) {
            return res.json({success:false,message:messages.WISHLIST.WISHLIST_DUPLICATE})
        }
    
        wishlist.items.push({
            product_id:product._id,
            variant_id:variantId
        })
    }

    await wishlist.save()
    const wishlistCount = wishlist.items.length

    res.json({success:true,message:messages.WISHLIST.WISHLIST_ADDED,count:wishlistCount})
})

const removeFromWishlist = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    const variantId = req.params.variantId

    if(!userId) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.AUTH.USER_NOT_FOUND})
    }

    const result = await Wishlist.updateOne(
        {user_id:userId},{$pull:{items:{variant_id:variantId}}}
    )

    if(result.modifiedCount === 0) {
        return res.json({success:false,message:messages.WISHLIST.WISHLIST_NOT_FOUND})
    }

    res.json({success:true,message:messages.WISHLIST.WISHLIST_REMOVED})
})

const loadWishlist = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    if(!userId) return res.redirect('/auth/login')

    const wishlist = await Wishlist.findOne({user_id:userId}).populate({path:'items.product_id',populate:[{path:'brand_id',select:'name'},{path:'category_id',select:'name'},],}).lean()
    const wishListLength = wishlist ? wishlist.items.length : 0
    res.render('user/wishlist',{layout:'layouts/user_main',wishlist,wishListLength})
})

const getWishlistCount = asyncHandler( async( req,res) => {
    if(!req.session.user._id) {
        return res.json({count:0})
    }
    const userId = req.session.user._id
    const wishlist = await Wishlist.findOne({user_id:userId}).lean()
    const count = wishlist ? wishlist.items.length : 0

    res.json({count})
})



module.exports = {addToWishlist,removeFromWishlist,loadWishlist,getWishlistCount}