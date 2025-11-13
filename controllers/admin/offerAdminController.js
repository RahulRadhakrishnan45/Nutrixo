const asyncHandler = require('express-async-handler')
const Offer = require('../../models/offerSchema')
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Brand = require('../../models/brandSchema')
const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')
const category = require('../../models/categorySchema')
const product = require('../../models/productSchema')
const normalizeIds = require('../../utils/normalizeIds')

const loadOffers = asyncHandler( async( req,res) => {
    const page = parseInt(req.query.page) || 1
    const limit = 5
    const skip = (page - 1) * limit

    const totalOffers = await Offer.countDocuments()

    const offers = await Offer.find().sort({createdAt:-1}).skip(skip).limit(limit)
    const totalPages = Math.ceil(totalOffers / limit)

    const categories = await Category.find().lean()
    const productData = await Product.find().lean()
    const brands = await Brand.find().lean()

    const products = []
    productData.forEach((p) => {
        if(Array.isArray(p.variants)) {
            p.variants.forEach((v,index) => {
                products.push({
                    id:`${p._id}-${index}`,
                    productId:p._id,
                    title:`${p.title} - ${v.flavour} (${v.size})`,
                })
            })
        }else{
            products.push({
                productId:p._id,
                title:p.title
            })
        }
    })

    res.render('admin/offer',{layout:'layouts/admin_main',offers,categories,products,brands,currentPage:page,totalPages,query:req.query})
})

const loadAddOffer = asyncHandler( async( req,res) => {
    const categories = await Category.find().lean()
    const products = await Product.find().lean()
    const brands = await Brand.find().lean()

    const productVariants = []
    products.forEach((p) => {
        if(Array.isArray(p.variants)) {
            p.variants.forEach((v,index) => {
                productVariants.push({
                    id:`${p._id}-${index}`,
                    productId:p._id,
                    title:`${p.title} - ${v.flavour} (${v.size})`,
                })
            })
        }
    })

    res.render('admin/addOffer',{layout:'layouts/admin_main',categories,products:productVariants,brands})
})

const createOffer = asyncHandler( async( req,res) => {
    const {offerName,discountPercentage,validFrom,validTo,category,product,brand,isActive} = req.body

    if(!offerName || !discountPercentage || !validFrom || !validTo) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.AUTH.ALL_FIELDS_REQUIRED})
    }

    const discount = parseFloat(discountPercentage)
    if(isNaN(discount) || discount < 1 || discount >90) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.DISCOUNT.DISCOUNT_RANGE_LIMIT_EXCEED})
    }

    const start = new Date(validFrom)
    const end = new Date(validTo)

    if(start > end) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.DATE.DATE_INVALID})
    }

    const existingOffer = await Offer.findOne({offerName:{$regex:new RegExp(`${offerName}$`, 'i')},})
    if(existingOffer) {
        return res.status(httpStatus.conflict).json({success:false,message:messages.OFFER.OFFER_EXISTS})
    }

    const categoryArray = normalizeIds(category)
    const productArray = normalizeIds(product)
    const brandArray = normalizeIds(brand)

    const newOffer = new Offer({
        offerName:offerName.trim(),
        discountPercentage:discount,
        validFrom:start,
        validTo:end,
        category:categoryArray,
        product:productArray,
        brand:brandArray,
        isActive:isActive === 'on' || isActive === true,
    })
    
    await newOffer.save()

    return res.status(httpStatus.created).json({success:true, message:messages.OFFER.OFFER_CREATED,redirect:'/admin/offers'})
})

const updateOffer = asyncHandler( async( req,res) => {
    const offerId = req.params.id
    const {offerName,discountPercentage,validFrom,validTo,category,product,brand,isActive} = req.body

    const updateOffer = await Offer.findByIdAndUpdate(offerId,{offerName,discountPercentage,validFrom,validTo,
        category:category ? [].concat(category) : [],
        product:product ? [].concat(product) : [],
        brand:brand ? [].concat(brand) : [],
        isActive:isActive === 'true' || isActive === true
    },{new:true})

    if(!updateOffer) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.OFFER.OFFER_NOT_FOUND})
    }

    res.status(httpStatus.ok).json({success:true,message:messages.OFFER.OFFER_UPDATED})
})

const deleteOffer = asyncHandler( async( req,res) => {
    const offerId = req.params.id
    const deleteOffer = await Offer.findByIdAndDelete(offerId)
    if(!deleteOffer) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.OFFER.OFFER_NOT_FOUND})
    }

    res.status(httpStatus.ok).json({success:true,message:messages.OFFER.OFFER_DELETED})
})

const updateOfferStatus = asyncHandler( async( req,res) => {
    const offerId = req.params.id
    const {isActive} = req.body

    const updated = await Offer.findByIdAndUpdate(offerId,{isActive},{new:true})
    if(!updated) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.OFFER.OFFER_NOT_FOUND})
    }

    res.status(httpStatus.ok).json({success:true,message:messages.OFFER.OFFER_STATUS_UPDATED})
})

module.exports = {loadOffers,loadAddOffer,createOffer,updateOffer,deleteOffer,updateOfferStatus}
