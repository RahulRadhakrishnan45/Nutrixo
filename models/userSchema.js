const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({

    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: false },
    mobile: { type: String, required: false, unique: true, sparse: true, trim: true },
    googleId: { type: String, unique: true },
    profile_image: { type: String, default: null },
    is_active: { type: Boolean, default: true },
    referralCode: { type: String,unique: true,index: true},
    referredBy: { type: mongoose.Schema.Types.ObjectId,ref:'user',default: null},
    referralClaimed: { type:Boolean,default:false},
}, { timestamps: true })

userSchema.pre('save', async function (next) {
    if (this.referralCode) return next()

    let code
    let exists = true

    while (exists) {
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase()
        code = `NUT${randomPart}`

        exists = await this.constructor.findOne({ referralCode: code })
    }

    this.referralCode = code
    next()
})

const user = mongoose.model('user', userSchema)
module.exports = user
