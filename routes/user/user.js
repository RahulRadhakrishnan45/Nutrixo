const express = require('express')
const router = express.Router()
const {checkSession} = require('../../middlewares/checkSession')
const userController = require('../../controllers/user/product_userController')
const cartController = require('../../controllers/user/cart_userController')
const cart = require('../../models/cartSchema')


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


module.exports = router 