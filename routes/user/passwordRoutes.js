const express = require('express')
const router = express.Router()
const { checkSession } = require('../../middlewares/checkSession')
const passwordController = require('../../controllers/user/passwordUserController')

router.get('/', checkSession, passwordController.loadChangePassword)
router.post('/', checkSession, passwordController.postChangePassword)

module.exports = router
