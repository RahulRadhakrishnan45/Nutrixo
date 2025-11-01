const Category = require('../models/categorySchema')
const Brand = require('../models/brandSchema')
const Cart = require('../models/cartSchema')

async function headerData(req,res,next) {
    try {
        const categories = await Category.find({is_active:true,is_deleted:false}).select('name -_id')
        res.locals.categories =  categories.length ? categories.map(c => c.name) : []

        const brands = await Brand.find({is_active:true,is_delete:false}).select('name =_id')
        res.locals.brands = brands.length ? brands.map(b => b.name) : []

        if(req.session.user?._id) {
            const cart = await Cart.findOne({user_id:req.session.user._id}).lean()
            const count = cart ? cart.items.reduce((sum,i) => sum + i.quantity, 0) : 0
            res.locals.cartLength = count > 5 ? '5+' : count
        }else{
            res.locals.cartLength =0
        }
        next()
    } catch (error) {
        console.log('HeaderData middleware error',error)
        res.locals.categories = []
        res.locals.brands = []
         res.locals.cartLength = 0
        next()
    }

}

module.exports = headerData