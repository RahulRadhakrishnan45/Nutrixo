const asyncHandler = require('express-async-handler')
const User = require('../../models/userSchema')
const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')
const Product = require('../../models/productSchema')
const product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const Brand = require('../../models/brandSchema')




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

    const {brand,flavour,size,minPrice,maxPrice,category,sort} = req.query

    const query = {}

    if(category && category !== 'All') {
        const selectedCategory = await Category.findOne({name:category,is_active:true}).select('_id')
        if(selectedCategory) {
        query['category_id'] = selectedCategory._id
        }
    }

    const dbProducts = await Product.find(query).populate('brand_id','name is_active is_delete').populate('category_id','name is_active is_deleted')
    
    const products = []
    dbProducts.forEach(p => {

        if(!p.brand_id?.is_active || !p.category_id?.is_active) {
            return
        }
        p.variants.filter(v => v.is_active).forEach(v => {

            if (brand && brand !== "All" && p.brand_id?.name !== brand) return;
            if (flavour && flavour !== "All" && v.flavour !== flavour) return;
            if (size && size !== "All" && v.size !== size) return;
            const priceToCheck = v.discounted_price || v.price;
            if (minPrice && priceToCheck < Number(minPrice)) return;
            if (maxPrice && priceToCheck > Number(maxPrice)) return;

            products.push({
               productId: p._id,
              _id: v._id,
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

    if(sort) {
        if(sort === 'priceLowHigh') {
            products.sort((a,b) => a.discounted_price - b.discounted_price)
        }else if(sort === 'priceHighLow') {
            products.sort((a,b) => b.discounted_price - a.discounted_price)
        }else if(sort === 'nameAZ') {
            products.sort((a,b) => a.name.localeCompare(b.name))
        }else if(sort === 'nameZA') {
            products.sort((a,b) => b.name.localeCompare(a.name))
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

    res.render('user/product',{layout:'layouts/user_main',products:paginatedVariants,currentPage:page,totalPages,brands:brands.map(b =>b.name),flavours,sizes,categories:categories.map(c => c.name),selectedFilters:{brand:brand && brand !== "All" ? brand: null,flavour: flavour && flavour !== "All" ? flavour: null,size: size && size !== "All" ? size: null,minPrice,maxPrice,category: category && category !== "All" ? category : null,sort:sort || null},query:req.query})
})

const loadSingleProduct = asyncHandler( async( req,res) => {
    const productId = req.params.id
    const variantId = req.query.variant

    const product = await Product.findById(productId).populate('category_id').populate('brand_id').lean()
    
    if(!product || !product.brand_id?.is_active || !product.category_id?.is_active) {
        return res.status(httpStatus.not_found).render('user/404-page',{layout:false})
    }

    let selectedVariant = product.variants[0]
    if(variantId) {
        const found = product.variants.find(v => v._id.toString() === variantId)
        if(found) {
            selectedVariant = found
        }
    }

    const relatedProducts = await Product.find({
        category_id:product.category_id,
        _id:{$ne:product._id},
        is_active:true
    }).limit(4).lean()

    res.render('user/productDetail',{layout:'layouts/user_main',product, relatedProducts,selectedVariant})
})




module.exports = {loadHome,loadProfile,logoutUser,loadProducts,loadSingleProduct}