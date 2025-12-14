const express = require('express')
const router = express.Router()
const contactController = require('../../controllers/user/contactUserController')

router.get('/', contactController.loadContactPage)

module.exports = router