const express = require('express')
const router = express.Router()
const offerController = require('../../controllers/admin/offerAdminController')
const {checkAdminSession} = require('../../middlewares/checkSession')


router.get('/',checkAdminSession,offerController.loadOffers)
router.get('/new',checkAdminSession,offerController.loadAddOffer)
router.post('/',checkAdminSession,offerController.createOffer)
router.put('/:id',checkAdminSession,offerController.updateOffer)
router.delete('/:id',checkAdminSession,offerController.deleteOffer)
router.patch('/:id/status',checkAdminSession,offerController.updateOfferStatus)


module.exports = router