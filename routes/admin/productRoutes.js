const express = require('express')
const router = express.Router()
const productController = require('../../controllers/admin/productAdminController')
const { checkAdminSession } = require('../../middlewares/checkSession')
const { uploadProduct } = require('../../config/multer')

router.get('/', checkAdminSession, productController.loadProducts)
router.get('/add', checkAdminSession, productController.loadAddProduct)
router.get('/search', checkAdminSession, productController.searchProducts)
router.post('/add', checkAdminSession, uploadProduct.any(), productController.addProduct)
router.patch('/:id/edit', checkAdminSession, uploadProduct.any(), productController.editProduct)
router.delete('/:productId/variants/:variantId/delete', checkAdminSession, productController.deleteProduct)
router.patch('/:productId/variants/:variantId/restore', checkAdminSession, productController.restoreVariant)

module.exports = router
