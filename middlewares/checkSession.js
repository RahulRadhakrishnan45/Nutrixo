const checkSession = (req,res,next) =>{
    if(req.session && req.session.user){
        next()
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