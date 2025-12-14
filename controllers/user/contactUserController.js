const asyncHandler = require('express-async-handler')

const loadContactPage = asyncHandler( async( req,res) => {
    res.render('user/contact',{layout:'layouts/user_main'})
})

module.exports = {loadContactPage}