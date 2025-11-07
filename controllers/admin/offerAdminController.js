const asyncHandler = require('express-async-handler')
const Offer = require('../../models/offerSchema')
const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')

const loadOffers = asyncHandler( async( req,res) => {
    const page = parseInt(req.query.page) || 1
    const limit = 5
    const skip = (page - 1) * limit

    const totalOffers = await Offer.countDocuments()

    const offers = await Offer.find().sort({createdAt:-1}).skip(skip).limit(limit)
    const totalPages = Math.ceil(totalOffers / limit)

    res.render('admin/offer',{layout:'layouts/admin_main',offers,currentPage:page,totalPages,query:req.query})
})

module.exports = {loadOffers}