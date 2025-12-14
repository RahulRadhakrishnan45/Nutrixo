const express = require('express')
const router = express.Router()
const aboutController = require('../../controllers/user/aboutUserController')

router.get('/',aboutController.loadAboutPage)


module.exports = router
