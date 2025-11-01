const express = require('express')
const router = express.Router()
const categoryController = require('../../controllers/admin/categoryAdminController')
const { checkAdminSession } = require('../../middlewares/checkSession')

router.get('/', checkAdminSession, categoryController.loadCategories)
router.post('/add', checkAdminSession, categoryController.addCategory)
router.patch('/toggle/:id', checkAdminSession, categoryController.toggleCategory)
router.put('/:id/edit', checkAdminSession, categoryController.editCategory)
router.delete('/:id/delete', checkAdminSession, categoryController.deleteCategory)
router.patch('/:id/restore', checkAdminSession, categoryController.restoreCategory)

module.exports = router