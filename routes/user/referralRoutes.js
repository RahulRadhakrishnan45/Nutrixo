const express = require('express')
const router = express.Router()
const {checkSession} = require('../../middlewares/checkSession')
const referralController = require('../../controllers/user/referralUserController')

router.get('/',checkSession,referralController.loadReferralPage)
router.post('/',checkSession,referralController.applyReferralCode)


module.exports = router
