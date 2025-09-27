const express = require('express')
const router = express.Router()
const {checkSession} = require('../../middlewares/checkSession')
const userController = require('../../controllers/user/product_userController')
const cartController = require('../../controllers/user/cart_userController')
const profileController = require('../../controllers/user/profileUserController')
const {uploadProfile} = require('../../config/multer')


router.get('/',checkSession,userController.loadHome)
router.get('/profile',checkSession,userController.loadProfile)
router.get('/logout',userController.logoutUser)


router.get('/products',checkSession,userController.loadProducts)
router.get('/products/:id',checkSession,userController.loadSingleProduct)


router.post('/cart/add',checkSession,cartController.addToCart)
router.get('/cart',checkSession,cartController.loadCart)
router.post('/cart/increase/:id',checkSession,cartController.increaseQty)
router.post('/cart/decrease/:id',checkSession,cartController.decreaseQty)
router.post('/cart/remove/:id',checkSession,cartController.removeItem)


router.post('/profile/upload',checkSession,uploadProfile.single('profile_image'),profileController.uploadProfileImage)
router.get('/profile/address',checkSession,profileController.loadAddress)
router.post('/profile/address',checkSession,profileController.addAddress)
router.put('/profile/address/edit/:id',checkSession,profileController.updateAddress)
router.delete('/profile/address/delete/:id',checkSession,profileController.deleteAddress)
router.put('/profile/address/set-default/:id',checkSession,profileController.setDefaultAddress)


module.exports = router 