const express = require('express')
const router = express.Router()
const wishlistController = require('../../controllers/user/wishlistUserController')
const {checkSession} = require('../../middlewares/checkSession')


router.post('/:variantId',checkSession,wishlistController.addToWishlist)
router.delete('/:variantId',checkSession,wishlistController.removeFromWishlist)
router.get('/',checkSession,wishlistController.loadWishlist)
router.get('/count',checkSession,wishlistController.getWishlistCount)


module.exports = router