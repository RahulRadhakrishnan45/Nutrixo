const express = require('express')
const router = express.Router()
const userController = require('../../controllers/admin/userAdminController')
const { checkAdminSession } = require('../../middlewares/checkSession')

router.get('/', checkAdminSession, userController.loadCustomers)
router.patch('/:userId/status', checkAdminSession, userController.blockCustomers)
router.get('/search', checkAdminSession, userController.searchCustomers)

module.exports = router
