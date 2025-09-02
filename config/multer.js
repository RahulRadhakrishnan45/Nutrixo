const multer = require('multer')
const path = require('path')

const brandStorage = multer.diskStorage({
    destination:(req,file,cb) => {
        cb(null,path.join(__dirname,'../public/uploads/brands'))
    },
    filename:(req,file,cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null,uniqueSuffix + path.extname(file.originalname))
    }
})

const productStorage = multer.diskStorage({
    destination:(req,file,cb) => {
        cb(null, path.join(__dirname,'../public/uploads/products'))
    },
    filename: (req,file,cb) => {
        const uniqueSuffix = Date.now() + '-' +Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
})

const fileFilter = (req,file,cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const ext = path.extname(file.originalname).toLowerCase()
    
    if(allowedTypes.test(ext)) {
        cb(null,true)
    }else {
        cb(new Error('Only images are allowed'),false)
    }
}

const uploadBrand = multer({storage:brandStorage,fileFilter})
const uploadProduct = multer({storage:productStorage,fileFilter})

module.exports = {uploadBrand,uploadProduct}