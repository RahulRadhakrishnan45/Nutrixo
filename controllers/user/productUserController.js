const asyncHandler = require('express-async-handler')
const User = require('../../models/userSchema')
const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')
const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const Brand = require('../../models/brandSchema')
const Address = require('../../models/addressSchema')
const Wishlist = require('../../models/wishlistSchema')
const Offer = require('../../models/offerSchema')
const applyOffersToProduct = require('../../utils/applyOffer')


const loadHome = asyncHandler(async (req,res) =>{
    const now = new Date()
    const activeOffers = await Offer.find({
        isActive:true,validFrom:{$lte:now},validTo:{$gte:now},
    }).lean()
    
    const products = await Product.find().sort({createdAt:-1}).populate('brand_id category_id').lean()
    const offeredProducts = await Promise.all(products.map(p => applyOffersToProduct(p, activeOffers)))

    let variants = offeredProducts.flatMap(product =>
        product.variants.filter(v => v.is_active && v.stock > 0)
        .map(v => ({
            productId:product._id,
            variantId:v._id,
            title:product.title,
            description: product.description,
            category: product.category_id,
            brand: product.brand_id,
            flavour: v.flavour,
            size: v.size,
            price: v.price,
            calculated_price: v.calculated_price,
            offerPercent: v.offerPercent || 0,
            images: v.images,
            stock: v.stock,
        }))
    )

    variants = variants.slice(0,4)

    const categories = await Category.find({is_active:true,is_deleted:false}).select('name -_id')
    const brands = await Brand.find({is_active:true,is_delete:false}).select('name -_id')

    res.render('user/home',{layout:'layouts/user_main',newArrivals:variants,categories:categories.map(c=>c.name),brands:brands.map(b=>b.name)})
})

const loadProfile = asyncHandler( async (req,res) => {
    const userId = req.session.user._id

    if(!userId) {
        return res.redirect('/auth/login')
    }
    
    const user = await User.findById(userId).lean()
    const addresses = await Address.find({user_id:userId}).lean()

    res.render('user/profile',{layout:'layouts/user_main',user,addresses})
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

    const {brand,flavour,size,minPrice,maxPrice,category,sort,q} = req.query

    const query = {}

    if(category && category !== 'All') {
        const selectedCategory = await Category.findOne({name:category,is_active:true}).select('_id')
        if(selectedCategory) {
        query['category_id'] = selectedCategory._id
        }
    }

    const dbProducts = await Product.find(query).populate('brand_id','name is_active').populate('category_id','name is_active').lean()

    const products = []
    const min = Number(minPrice) || 0
    const max = Number(maxPrice) || Infinity
    for(const p of dbProducts) {
        if (!p.brand_id?.is_active || !p.category_id?.is_active) continue

        const offeredProduct = await applyOffersToProduct(p)

        const activeVariants = offeredProduct.variants?.filter((v) => v.is_active !== false && v.stock > 0) || []
        if(activeVariants.length === 0) continue
        
        for(const v of activeVariants) {
            const basePrice = Number(v.calculated_price || v.price)
            if(basePrice < min || basePrice > max) continue
            if (flavour && flavour !== "All" && v.flavour !== flavour) continue
            if (brand && brand !== "All" && p.brand_id?.name !== brand) continue
            if (size && size !== "All" && v.size !== size) continue
            if (
                q &&
                !p.title.toLowerCase().includes(q.toLowerCase()) &&
                !(v.flavour && v.flavour.toLowerCase().includes(q.toLowerCase())) &&
                !(v.size && v.size.toLowerCase().includes(q.toLowerCase()))
            ) 
                continue

            products.push({
                productId: p._id,
                _id: v._id,
                name: `${p.title} ${v.flavour || ''} ${v.size || ''}`,
                brand: p.brand_id?.name || 'Unknown',
                category: p.category_id?.name || 'Uncategorized',
                image: v.images?.[0] || '/images/no-image.png',
                price: Number(v.price),
                calculated_price: Number(basePrice.toFixed(2)),
                stock: v.stock,
                offerPercent: v.offerPercent || null,
            })
        }
    }

    if(sort) {
        if (sort === "priceLowHigh") {
            products.sort((a, b) => a.calculated_price - b.calculated_price);
        } else if (sort === "priceHighLow") {
            products.sort((a, b) => b.calculated_price - a.calculated_price);
        } else if (sort === "nameAZ") {
            products.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sort === "nameZA") {
            products.sort((a, b) => b.name.localeCompare(a.name));
        }
    }

    const totalVariants = products.length
    const totalPages = Math.ceil(totalVariants / limit)

    const start = (page - 1) * limit
    const end = start + limit
    const paginatedVariants = products.slice(start,end)

    const brands = await Brand.find({is_active:true,is_delete:false}).select('name -_id')
    const flavours = await Product.distinct('variants.flavour', {'variants.is_active':true})
    const sizes = await Product.distinct("variants.size", { "variants.is_active": true })
    const categories = await Category.find({is_active:true,is_deleted:false}).select('name -_id')

    let userWishlist = []
    if(req.session.user) {
        const wishlist = await Wishlist.findOne({user_id:req.session.user._id}).select('items.variant_id').lean()
        userWishlist = wishlist?.items?.map((i) => i.variant_id.toString()) || []
    }

    res.render('user/product',{layout:'layouts/user_main',products:paginatedVariants,currentPage:page,totalPages,brands:brands.map(b =>b.name),flavours,sizes,categories:categories.map(c => c.name),selectedFilters:{brand:brand && brand !== "All" ? brand: null,flavour: flavour && flavour !== "All" ? flavour: null,size: size && size !== "All" ? size: null,minPrice,maxPrice,category: category && category !== "All" ? category : null,sort:sort || null,q:q || null,},query:req.query,userWishlist})
})

const loadSingleProduct = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    const productId = req.params.id
    const variantId = req.query.variant

    const product = await Product.findById(productId).populate('category_id').populate('brand_id').lean()
    
    if(!product || !product.brand_id?.is_active || !product.category_id?.is_active) {
        return res.status(httpStatus.not_found).render('user/404-page',{layout:false})
    }

    const offeredProduct = await applyOffersToProduct(product)
    const activeVariants = offeredProduct.variants.filter((v) => v.is_active)

    if(activeVariants.length === 0) {
        return res.status(httpStatus.not_found).render('user/404-page', {layout:false})
    }

    let selectedVariant 
    if(variantId) {
        selectedVariant = activeVariants.find((v) => v._id.toString() === variantId)
    }

    if(!selectedVariant) {
        selectedVariant = activeVariants.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0]
    }

    const relatedProducts = await Product.find({
        category_id:product.category_id._id,
        _id:{$ne:product._id},
        'variants.size':selectedVariant.size,
        'variants.is_active':true
    }).limit(4).populate('brand_id').populate('category_id').lean()

    for(let i=0;i<relatedProducts.length;i++) {
        relatedProducts[i] = await applyOffersToProduct(relatedProducts[i])
    }

    let userWishlist = []
    if(req.session.user?._id) {
        const wishlist = await Wishlist.findOne({user_id:userId}).select('items.variant_id').lean()
        userWishlist = wishlist?.items?.map((i) => i.variant_id.toString() || [])
    }

    res.render('user/productDetail',{layout:'layouts/user_main',product:{...offeredProduct,variants:activeVariants}, relatedProducts,selectedVariant,userWishlist})
})

const searchProducts = asyncHandler( async( req,res) => {
    const query = req.query.q?.trim()
    if(!query) return res.json([])

    const dbProducts = await Product.find({
        title: {$regex:query,$options:'i'}
    }).populate('brand_id','name is_active is_delete').populate('category_id','name is_active is_delete').lean()

    const result = []

    dbProducts.forEach(p => {
        if(!p.brand_id?.is_active || !p.category_id?.is_active) return

        p.variants.filter(v => v.is_active).forEach(v => {
            result.push({
                productId:p._id,
                variantId:v._id,
                title:p.title,
                brand:p.brand_id?.name || 'unknown',
                category:p.category_id?.name || 'uncategorized',
                flavour:v.flavour,
                size:v.size,
                price:v.price,
                discounted_price:v.discounted_price || v.price,
                image: v.images && v.images.length > 0 ? v.images[0] : '/images/no-image.png'
            })
        })
    })

    res.json(result.slice(0,8))
})


module.exports = {loadHome,loadProfile,logoutUser,loadProducts,loadSingleProduct,searchProducts}
