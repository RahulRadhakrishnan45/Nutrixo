const express = require('express')
const router = express.Router()
const adminController = require('../../controllers/admin/admin_authController')
const categoryController = require('../../controllers/admin/category_adminController')
const brandController = require('../../controllers/admin/brand_adminController')
const productController = require('../../controllers/admin/product_adminController')
const userController = require('../../controllers/admin/user_adminController')
const {checkAdminSession} = require('../../middlewares/checkSession')
const {uploadBrand,uploadProduct} = require('../../config/multer')

router.get('/login',adminController.loadLogin)
router.post('/login',adminController.login)


router.get('/dashboard',checkAdminSession,adminController.loadDashboard)
router.post('/logout',adminController.logout)


router.get('/category',checkAdminSession,categoryController.loadCategories)
router.post('/category/add',checkAdminSession,categoryController.addCategory)
router.patch('/category/toggle/:id',checkAdminSession,categoryController.toggleCategory)
router.put('/category/:id/edit',checkAdminSession,categoryController.editCategory)
router.delete('/category/:id/delete',checkAdminSession,categoryController.deleteCategory)
router.patch('/category/:id/restore',checkAdminSession,categoryController.restoreCategory)


router.get('/brands',checkAdminSession,brandController.loadBrands)
router.post('/brands/add',checkAdminSession,uploadBrand.single('logo_url'),brandController.addBrand)
router.patch('/brands/toggle/:id',checkAdminSession,brandController.toggleBrand)
router.delete('/brands/:id/delete',checkAdminSession,brandController.deleteBrand)
router.patch('/brands/:id/restore',checkAdminSession,brandController.restoreBrand)


router.get('/products',checkAdminSession,productController.loadProducts)
router.get('/products/add',checkAdminSession,productController.loadAddProduct)
router.get('/products/search',checkAdminSession,productController.searchProducts)
router.post('/products/add',checkAdminSession,uploadProduct.any(),productController.addProduct)
router.patch('/products/:id/edit',checkAdminSession,uploadProduct.any(),productController.editProduct)
router.delete('/products/:productId/variants/:variantId/delete',checkAdminSession,productController.deleteProduct)
router.patch('/products/:productId/variants/:variantId/restore',checkAdminSession,productController.restoreVariant)


router.get('/customers',checkAdminSession,userController.loadCustomers)
router.patch('/customers/:userId/block',checkAdminSession,userController.blockCustomers)
router.get('/customers/search',checkAdminSession,userController.searchCustomers)





module.exports = router