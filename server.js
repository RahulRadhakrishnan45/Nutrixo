const express = require('express')
const path = require('path')
const env = require('dotenv').config()
const session = require('express-session')
const nocache = require('nocache')
const expressLayouts = require('express-ejs-layouts')
const flash = require('connect-flash')
const userRoutes = require('./routes/user')
const adminRoutes = require('./routes/admin')
const authRoutes = require('./routes/auth_routes')
const connectDB = require('./config/connectDB')
const globalMiddleware = require('./middlewares/globalMiddleware')


const app = express()
const port = process.env.PORT || 3001



app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(expressLayouts)
app.use(nocache())
app.use(globalMiddleware)

app.set('view engine','ejs')
app.set('views',path.join(__dirname,'views'))

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      secure: false,
      httpOnly: true
    },
  })
)

app.use(userRoutes)
app.use('/admin',adminRoutes)
app.use('/auth',authRoutes)

app.all('/*splat',(req,res)=>{
    res.render('user/404-page',{layout:false})
})


app.listen(process.env.PORT,()=>{
    console.log(`server running at http://localhost:${port}`)
    connectDB()
});

