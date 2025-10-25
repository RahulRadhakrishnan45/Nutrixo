const express = require('express')
const router = express.Router()
const brandController = require('../../controllers/admin/brandAdminController')
const { checkAdminSession } = require('../../middlewares/checkSession')
const { uploadBrand } = require('../../config/multer')

router.get('/', checkAdminSession, brandController.loadBrands)
router.post('/add', checkAdminSession, uploadBrand.single('logo_url'), brandController.addBrand)
router.patch('/toggle/:id', checkAdminSession, brandController.toggleBrand)
router.delete('/:id/delete', checkAdminSession, brandController.deleteBrand)
router.patch('/:id/restore', checkAdminSession, brandController.restoreBrand)

module.exports = router
