const messages = require('../../constants/messages')
const httpStatus = require('../../constants/httpStatus')
const Product = require('../../models/productSchema')
const asyncHandler = require('express-async-handler')
const Category = require('../../models/categorySchema')
const Brand = require('../../models/brandSchema')
const {FLAVOURS,SIZES} = require('../../constants/productOptions')
const category = require('../../models/categorySchema')
const product = require('../../models/productSchema')





const loadProducts = asyncHandler( async( req,res) => {
    const perPage = 7
    const page = parseInt(req.query.page) || 1

    const allProducts = await Product.find().populate('category_id').populate('brand_id').sort({createdAt:-1})

    let rows = []
    allProducts.forEach(product => {
        product.variants.forEach(variant => {
            rows.push({
                productId:product._id,
                productTitle:product.title,
                productDescription:product.description,
                productCategory:product.category_id,
                productBrand:product.brand_id,
                allVariants:product.variants,
                ...variant.toObject()
            })
        })
    })

    const totalRows = rows.length
    rows = rows.slice((page - 1) * perPage, page * perPage)

    const categories = await Category.find()
    const brands = await Brand.find()
    
    res.render('admin/productlist',{layout:'layouts/admin_main',rows,categories,brands,flavours:FLAVOURS,sizes:SIZES,currentPage:page,totalPages:Math.ceil(totalRows / perPage)})
})

const loadAddProduct = asyncHandler( async( req,res) => {
    const categories = await Category.find()
    const brands = await Brand.find()

    res.render('admin/addProduct',{layout:'layouts/admin_main',categories,brands,flavours:FLAVOURS,sizes:SIZES})
})

const addProduct = asyncHandler( async( req,res) => {
    
    const {title,description,category_id,brand_id,flavour,price,discounted_price,stock,size} = req.body
    
    const existingProduct = await Product.findOne({
        title:title.trim(),
        category_id,
        brand_id
    })

    if(existingProduct) {
        for(let i=0; i<size.length;i++) {
            const duplicateVariant = existingProduct.variants.find(
                v =>
                    v.flavour.toLowerCase() === flavour[i].toLowerCase() && v.size.toString() === size[i].toString()
            )

            if(duplicateVariant) {
                return res.status(httpStatus.bad_request).json({success:false,field:'variants',message:messages.PRODUCT.PRODUCT_EXISTS})
            }
        }
    }

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
            flavour:flavour[i],
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
        variants
    })

    await newProduct.save()

    return res.status(httpStatus.created).json({success:true,field:'title',message:messages.PRODUCT.PRODUCT_ADD})

})

const editProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const { title, description, category_id, brand_id, flavour, size, price, discounted_price, stock } = req.body;

  const imagesByVariant = {};
  if (req.files && req.files.length > 0) {
    req.files.forEach(file => {
      const match = file.fieldname.match(/variant_images_(\d+)/);
      if (match) {
        const index = match[1];
        if (!imagesByVariant[index]) imagesByVariant[index] = [];
        imagesByVariant[index].push(`/uploads/products/${file.filename}`);
      }
    });
  }

  const existingProduct = await Product.findOne({
    _id:{$ne:productId},
    title:title.trim(),
    category_id,
    brand_id
  })

  if(existingProduct) {
    for(let i=0; i<size.length; i++) {
        const duplicateVariant = existingProduct.variants.find(
            v =>
                v.flavour.toLowerCase() === flavour[i].toLowerCase() && v.size.toString() === size[i].toString()
        )

        if(duplicateVariant) {
            return res.status(httpStatus.bad_request).json({success:false,field:'variants',message:messages.PRODUCT.PRODUCT_EXISTS})
        }
    }
  }

  const seen = new Set()
  for(let i=0;i<size.length;i++ ) {
    const key = flavour[i].toLowerCase() + "-" + size[i]
    if(seen.has(key)) {
        return res.status(httpStatus.bad_request).json({success:false,field:'variants',message:messages.VARIANT.VARIANT_EXISTS})
    }
    seen.add(key)
  }

  const variants = [];
  for (let i = 0; i < size.length; i++) {

    let keptImages = req.body[`existing_images_${i}`] || [];
    if (!Array.isArray(keptImages)) keptImages = keptImages ? [keptImages] : [];

    const uploadedImages = imagesByVariant[i] || [];
    variants.push({
      flavour: flavour[i],
      price: price[i],
      discounted_price: discounted_price[i],
      stock: stock[i],
      size: size[i],
      images: [...keptImages, ...uploadedImages]
    });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(httpStatus.not_found).json({ success: false, message: messages.PRODUCT.PRODUCT_NOT_FOUND });
  }

  product.title = title;
  product.description = description;
  product.category_id = category_id;
  product.brand_id = brand_id;
  product.variants = variants;

  await product.save();
  return res.json({ success: true, message: messages.PRODUCT.PRODUCT_UPDATE });
});

const deleteProduct = asyncHandler( async( req,res) => {
    const {productId,variantId} = req.params

    const product = await Product.findOneAndUpdate({_id:productId,"variants._id":variantId},
        {$set:{"variants.$.is_active":false}},
        {new:true}
    )

    if(!product) {
        return res.status(httpStatus.not_found).json({success:false,message:messages.VARIANT.VARIANT_NOT_FOUND})
    }

    res.json({success:true,message:messages.VARIANT.VARIANT_DELETE})
})

const restoreVariant = asyncHandler( async( req,res) => {
    const {productId,variantId} = req.params

    const product = await Product.findOneAndUpdate(
        {_id:productId,"variants._id":variantId},
        {$set:{"variants.$.is_active":true}},
        {new:true}
    )

    if(!product){
        return res.status(httpStatus.not_found).json({success:false,message:messages.VARIANT.VARIANT_NOT_FOUND})
    }

    res.json({success:true,message:messages.VARIANT.VARIANT_RESTORE})
})

const searchProducts = asyncHandler( async( req,res) => {
    const q = req.query.q?.trim()
    let products =[]

    if(!q) {
        products = await Product.find()
            .populate("category_id")
            .populate("brand_id")
    }else{

    const regex = new RegExp(q,"i")

     products = await Product.find({
        $or:[
            {title: regex},
            {"variant.flavour":regex},
            {"variant.size":regex}
        ]
    })
        .populate("category_id")
        .populate("brand_id")

        const brandMatches = await Brand.find({name:regex}).select("_id")
        const categoryMatches = await Category.find({name:regex}).select("_id")

        if(brandMatches.length || categoryMatches.length) {
            const moreProducts = await Product.find({
                $or:[
                    {brand_id:{$in:brandMatches.map(b => b._id)}},
                    {category_id:{$in:categoryMatches.map(c => c._id)}}
                ]
            })
            .populate("category_id")
            .populate("brand_id")

            const ids = new Set(products.map(p =>p._id.toString()))
            moreProducts.forEach(p => {
                if(!ids.has(p._id.toString())) products.push(p)
            })
        }
    }
        let rows = [];
    products.forEach(product => {
        product.variants.forEach(variant => {
            rows.push({
                productId: product._id,
                productTitle: product.title,
                productDescription: product.description,
                productCategory: product.category_id,
                productBrand: product.brand_id,
                allVariants: product.variants,
                ...variant.toObject()
            });
        });
    });

    res.json({ success: true, products: rows })
    
})










module.exports = {loadProducts,loadAddProduct,addProduct,editProduct,deleteProduct,restoreVariant,searchProducts}