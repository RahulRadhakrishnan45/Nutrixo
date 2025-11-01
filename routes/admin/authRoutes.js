const express = require('express')
const router = express.Router()
const adminController = require('../../controllers/admin/adminAuthController')
const categoryController = require('../../controllers/admin/categoryAdminController')
const brandController = require('../../controllers/admin/brandAdminController')
const productController = require('../../controllers/admin/productAdminController')
const userController = require('../../controllers/admin/userAdminController')
const {checkAdminSession} = require('../../middlewares/checkSession')
const {uploadBrand,uploadProduct} = require('../../config/multer')

router.get('/login',adminController.loadLogin)
router.post('/login',adminController.login)
router.get('/dashboard',checkAdminSession,adminController.loadDashboard)
router.post('/logout',adminController.logout)


module.exports = router
