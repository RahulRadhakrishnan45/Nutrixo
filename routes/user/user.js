const express = require('express')
const router = express.Router()
const {checkSession} = require('../../middlewares/checkSession')
const userController = require('../../controllers/user/product_userController')

router.get('/',checkSession,userController.loadHome)
router.get('/profile',checkSession,userController.loadProfile)
router.get('/logout',userController.logoutUser)

router.get('/products',checkSession,userController.loadProducts)


module.exports = router 