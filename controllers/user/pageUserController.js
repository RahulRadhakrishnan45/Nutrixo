const asyncHandler = require('express-async-handler')


const loadAboutPage = asyncHandler( async( req,res) => {
    res.render('user/about',{layout:'layouts/user_main'})
})


module.exports = {loadAboutPage}
