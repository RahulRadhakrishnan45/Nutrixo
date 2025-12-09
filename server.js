const express = require('express')
const path = require('path')
const dotenv = require('dotenv')
const session = require('express-session')
const nocache = require('nocache')
const expressLayouts = require('express-ejs-layouts')
const passport = require('./config/passport')
const userRoutes = require('./routes/user')
const adminRoutes = require('./routes/admin')
const connectDB = require('./config/connectDB')
const globalMiddleware = require('./middlewares/globalMiddleware')
const headerData = require('./middlewares/headerData')
const {errorLog,apiLog} = require('./config/logger')

dotenv.config()
const app = express()
const port = process.env.PORT || 3001

app.use(express.static('public'))
app.use('/uploads',express.static(path.join(__dirname,'uploads')))
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

app.use(headerData)
app.use(passport.initialize())
app.use(passport.session())

app.use(userRoutes)
app.use('/admin',adminRoutes)


app.all('/*splat',(req,res)=>{
    res.render('user/404-page',{layout:false})
})

app.use((err,req,res,next) => {
  errorLog.error(`Unhandled error: ${err.message} | Stack: ${err.stack}`)
  res.status(500).send('something went wrong! please try again later')
})


app.listen(process.env.PORT,()=>{
    console.log(`server running at http://localhost:${port}`)
    connectDB()
})
