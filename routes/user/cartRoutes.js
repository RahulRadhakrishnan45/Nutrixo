const express = require('express')
const router = express.Router()
const { checkSession } = require('../../middlewares/checkSession')
const cartController = require('../../controllers/user/cartUserController')

router.get('/', checkSession, cartController.loadCart)
router.post('/', checkSession, cartController.addToCart)
router.patch('/:id/increase', checkSession, cartController.increaseQty)
router.patch('/:id/decrease', checkSession, cartController.decreaseQty)
router.delete('/:id', checkSession, cartController.removeItem)

module.exports = router
