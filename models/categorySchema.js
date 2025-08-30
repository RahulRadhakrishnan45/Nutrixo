const mongoose = require('mongoose')
const categorySchema = new mongoose.Schema({
    name:{type:String, required:true, trim:true},
    is_active:{type:Boolean, default:true},
    is_deleted:{type:Boolean, default:false}
},{timestamps:true})

const category = mongoose.model('category',categorySchema)

module.exports = category