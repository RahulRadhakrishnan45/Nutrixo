const express = require('express')
const router = express.Router()
const brandController = require('../../controllers/admin/brandAdminController')
const { checkAdminSession } = require('../../middlewares/checkSession')
const { uploadBrand } = require('../../config/multer')

router.get('/', checkAdminSession, brandController.loadBrands)
router.post('/', checkAdminSession, uploadBrand.single('logo_url'), brandController.addBrand)
router.patch('/:id/status', checkAdminSession, brandController.toggleBrand)
router.delete('/:id', checkAdminSession, brandController.deleteBrand)
router.patch('/:id/restore', checkAdminSession, brandController.restoreBrand)

module.exports = router
