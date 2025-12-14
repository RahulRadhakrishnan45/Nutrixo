const express = require('express')
const router = express.Router()
const { checkSession } = require('../../middlewares/checkSession')
const { uploadProfile } = require('../../config/multer')
const profileController = require('../../controllers/user/profileUserController')
const userController = require('../../controllers/user/productUserController')


router.get('/', checkSession,userController.loadProfile)
router.post('/upload', checkSession, uploadProfile.single('profile_image'), profileController.uploadProfileImage)
router.get('/address', checkSession, profileController.loadAddress)
router.post('/address', checkSession, profileController.addAddress)
router.put('/address/:id', checkSession, profileController.updateAddress)
router.delete('/address/:id', checkSession, profileController.deleteAddress)
router.patch('/address/:id/default', checkSession, profileController.setDefaultAddress)
router.post('/update', checkSession, profileController.updateProfile)

module.exports = router
