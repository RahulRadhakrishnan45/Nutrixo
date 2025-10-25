const express = require('express')
const router = express.Router()
const { checkSession } = require('../../middlewares/checkSession')
const userController = require('../../controllers/user/productUserController')

router.get('/', checkSession, userController.loadHome)
router.get('/products', checkSession, userController.loadProducts)
router.get('/products/:id', checkSession, userController.loadSingleProduct)
router.get('/logout', userController.logoutUser)

module.exports = router
