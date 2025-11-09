const express = require('express')
const router = express.Router()
const offerController = require('../../controllers/admin/offerAdminController')
const {checkAdminSession} = require('../../middlewares/checkSession')


router.get('/',checkAdminSession,offerController.loadOffers)
router.get('/new',checkAdminSession,offerController.loadAddOffer)
router.post('/',checkAdminSession,offerController.createOffer)


module.exports = router