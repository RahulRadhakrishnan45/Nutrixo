const express = require('express')
const router = express.Router()
const checkSession = require('../middlewares/checkSession')
const authController = require('../controllers/user/auth_userController')

router.get('/',checkSession,authController.loadHome)




module.exports = router 