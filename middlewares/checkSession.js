const User = require('../models/userSchema')


const checkSession = async (req,res,next) =>{
    if(req.session && req.session.user){
        
        const user = await User.findById(req.session.user)

        if(user && user.is_active) {
            next()
        }else{
            req.session.destroy(() => {
                res.redirect('/auth/login')
            })
        }
        
    }else{
        res.redirect('/auth/login')
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