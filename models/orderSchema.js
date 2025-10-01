const mongoose = require('mongoose')
const orderSchema = new mongoose.Schema({
    user:{type:mongoose.Schema.Types.ObjectId,ref:'user',required:true},
    orderAddress:{type:mongoose.Schema.Types.ObjectId,ref:'Address',required:true},
    coupon:{type:mongoose.Schema.Types.ObjectId,ref:'Coupon',default:null},
    paymentStatus:{type:String,enum:['PENDING','COMPLETED','FAILED','REFUNDED'],default:'PENDING'},
    paymentMethod:{type:String,enum:['COD','CARD','WALLET','BANK'],default:'COD'},
    paymentDetails:{transactionId:String,paidAt:Date},
    subtotal:{type:Number,required:true},
    tax:{type:Number,required:true},
    shippingCost:{type:Number,default:0},
    couponDiscount:{type:Number,default:0},
    totalAmount:{type:Number,required:true},
    totalOfferApplied:{type:Number,default:0},
    orderNumber:{type:String,unique:true},
    items: [
  {
    product: {
        type: mongoose.Schema.Types.ObjectId,ref: 'product',required: true},
        variantId: {type: mongoose.Schema.Types.ObjectId,required: true},
        title: { type: String, required: true },
        flavour: String,
        size: String,
        image: String,
        price: { type: Number, required: true },   // final applied price
        quantity: { type: Number, required: true },
        totalPrice: { type: Number, required: true },

        tax: Number,
        discount: Number,
        offerApplied: Number,

    status: {type: String,enum: ['PROCESSING','PACKED','SHIPPED','DELIVERED','RETURN REQUESTED','CANCELLED','RETURNED',],default: 'PROCESSING',},
    statusHistory: [{status: String,timestamp: { type: Date, default: Date.now },note: String,},],
    expectedDelivery: {type: Date,
      default: () => {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date;
      },
    },
    returnRequest: {status: {type: String,enum: ['NONE', 'REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED'],default: 'NONE',},reason: String,requestedAt: Date,resolvedAt: Date,refundAmount: Number,},
  },],

},{timestamps:true})

    orderSchema.pre('save', async function (next) {
        if (!this.orderNumber) {
            const count = await mongoose.model('Order').countDocuments();
            this.orderNumber = `Nutrixo-${new Date()
                .toISOString()
                .slice(0, 10)
                .replace(/-/g, '')}-${(count + 1).toString().padStart(3, '0')}`;
        }
        next();
    });

module.exports = mongoose.model('Order',orderSchema)