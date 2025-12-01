const express = require('express')
const router = express.Router()
const {checkAdminSession} = require('../../middlewares/checkSession')
const reportController = require('../../controllers/admin/reportAdminController')

router.get('/',checkAdminSession,reportController.loadSalesReport)
router.get('/pdf',checkAdminSession,reportController.downloadPdf)
router.get('/excel',checkAdminSession,reportController.downloadExcel)


module.exports = router
