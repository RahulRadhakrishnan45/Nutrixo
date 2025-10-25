const express = require('express')
const router = express.Router()
const { checkSession } = require('../../middlewares/checkSession')
const cartController = require('../../controllers/user/cartUserController')

router.get('/', checkSession, cartController.loadCart)
router.post('/add', checkSession, cartController.addToCart)
router.post('/increase/:id', checkSession, cartController.increaseQty)
router.post('/decrease/:id', checkSession, cartController.decreaseQty)
router.post('/remove/:id', checkSession, cartController.removeItem)

module.exports = router
