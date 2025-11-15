const Wallet = require('../../models/walletSchema')
const asyncHandler = require('express-async-handler')
const messages = require('../../constants/messages')
const httpStatus = require('../../constants/httpStatus')
const razorpay = require('../../config/razorpay')
const crypto = require('crypto')


const loadWallet = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    let wallet = await Wallet.findOne({user_id:userId}).lean()
    if(!wallet) {
        wallet = await Wallet.create({user_id:userId,balance:0,transactions:[]})
        wallet = wallet.toObject()
    }

    const page = parseInt(req.query.page) || 1
    const limit = 5

    const totalTransactions = wallet.transactions.length
    const totalPages = Math.ceil(totalTransactions / limit)

    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit

    const PaginatedTransactions = wallet.transactions.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(startIndex,endIndex)

    PaginatedTransactions.forEach(t => {
        t.dateFormatted = new Date(t.createdAt).toLocaleDateString('en-IN',{
            day:'numeric',month:'long',year:'numeric'
        })
    })

    res.render('user/wallet',{layout:'layouts/user_main',walletBalance:wallet.balance,transactions:PaginatedTransactions,currentPage:page,totalPages,query:req.query})
})

const createRazorpayOrder = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    const {amount} = req.body
    if(!amount || amount < 10) {
        return res.json({success:false,message:messages.WALLET.MINIMUM_REQUIRED})
    }

    const options = {
        amount: amount * 100,
        currency:'INR',
        receipt:'wallet_' + Date.now()
    }

    const order = await razorpay.orders.create(options)
    return res.json({success:true,order,key_id:process.env.RAZORPAY_KEY_ID})
})

const verifyRazorpayPayment = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    const {razorpay_order_id, razorpay_payment_id, razorpay_signature, amount} = req.body
    
    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest('hex')
    
    if(expectedSignature !== razorpay_signature) {
        return res.json({success:false,message:messages.AUTH.INVALID_SIGN})
    }

    let wallet = await Wallet.findOne({user_id:userId})
    if(!wallet) {
        wallet = await Wallet.create({
            user_id:userId,balance:0,transactions:[]
        })
    }
    
    wallet.balance += Number(amount)

    wallet.transactions.push({
        amount:Number(amount),type:'CREDIT',description:'Money added to wallet',orderId:razorpay_order_id
    })

    await wallet.save()
    
    return res.json({success:true})
})


module.exports = {loadWallet,createRazorpayOrder,verifyRazorpayPayment}