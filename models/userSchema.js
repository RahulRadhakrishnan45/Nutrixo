const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    name:{type:String, required:true, trim:true},
    email:{type:String, required:true, unique:true, lowercase:true, trim:true},
    password:{type:String, required:true},
    mobile:{type:String, required:true, unique:true, trim:true},
    profile_image:{type:String, default:null},
    is_active:{type:Boolean, default:true},
},{timestamps:true})


const user = mongoose.model('user',userSchema)

module.exports = user