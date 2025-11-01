const User = require('../models/userSchema')


const checkSession = async (req,res,next) =>{
    if(req.session && req.session.user){
        
        const user = await User.findById(req.session.user._id)

        if(user && user.is_active) {
            next()
        }else{
            req.session.destroy(() => {
                if(req.xhr || req.headers['content-type']?.includes('application/json')) {
                    return res.status(401).json({success:false,message:'Session expired. Please login again'})
                }
                return res.redirect('/auth/login')
            })
        }
        
    }else{
        if(req.xhr || req.headers['content-type']?.includes('application/json')) {
            return res.status(401).json({success:false,message:'Unauthorized. Please login'})
        }
        return res.redirect('/auth/login')
    }
}

const checkAdminSession = (req,res,next) => {
    if(req.session && req.session.admin) {
        next()
    }else{
        res.redirect('/admin/login')
    }
}


module.exports = {checkSession,checkAdminSession}