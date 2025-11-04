const express = require('express')
const router = express.Router()
const categoryController = require('../../controllers/admin/categoryAdminController')
const { checkAdminSession } = require('../../middlewares/checkSession')

router.get('/', checkAdminSession, categoryController.loadCategories)
router.post('/', checkAdminSession, categoryController.addCategory)
router.patch('/:id/status', checkAdminSession, categoryController.toggleCategory)
router.put('/:id', checkAdminSession, categoryController.editCategory)
router.delete('/:id', checkAdminSession, categoryController.deleteCategory)
router.patch('/:id/restore', checkAdminSession, categoryController.restoreCategory)

module.exports = router