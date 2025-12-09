const express = require('express')
const router = express.Router()
const pageController = require('../../controllers/user/pageUserController')
const {checkSession} = require('../../middlewares/checkSession')

router.get('/',checkSession,pageController.loadAboutPage)


module.exports = router
