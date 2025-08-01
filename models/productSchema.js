const mongoose = require('mongoose')
const productSchema = new mongoose.Schema({
    title:{type:String, required:true, trim:true},
    description:{type:String, required:true},
    variants:[{
        flavour:{type:String, required:true, trim:true},
        price:{type:Number, required:true},
        stock:{type:Number, required:true},
        qunatity:{type:Number, required:true},
        images:[{type:String, required:true}]}],
        category_id:{type:mongoose.Schema.Types.ObjectId, ref:'brand', required:true},
        is_active:{type:Boolean, default:true}
    },{Timestamps:true})

    const product = mongoose.model('product',productSchema)

    module.exports = product