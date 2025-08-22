const express = require('express')
const router = express.Router()
const adminController = require('../controllers/admin/admin_authController')
const {checkAdminSession} = require('../middlewares/checkSession')

router.get('/login',adminController.loadLogin)
router.post('/login',adminController.login)

router.get('/dashboard',checkAdminSession,adminController.loadDashboard)

router.post('/logout',adminController.logout)








module.exports = router