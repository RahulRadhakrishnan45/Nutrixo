const express = require('express')
const router = express.Router()
const { checkSession } = require('../../middlewares/checkSession')
const userController = require('../../controllers/user/productUserController')

router.get('/',userController.loadHome)
router.get('/products',userController.loadProducts)
router.get('/products/:id', checkSession, userController.loadSingleProduct)
router.get('/logout', userController.logoutUser)

module.exports = router
