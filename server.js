const express = require('express')
const path = require('path')
const env = require('dotenv').config()
const expressLayouts = require('express-ejs-layouts')
const userRoutes = require('./routes/user')
const adminRoutes = require('./routes/admin')
const connectDB = require('./config/connectDB')

const app = express()
const port = process.env.port || 3001



app.use(express.static('public'))
app.use(expressLayouts)

app.set('view engine','ejs')
app.set(path.join(__dirname,'views'))
app.set('layout','layouts/layout')

app.use('/user',userRoutes)
app.use('/admin',adminRoutes)



app.listen(process.env.port,()=>{
    console.log(`server running at http://localhost:${port}/user/login`)
    connectDB()
});

module.exports = app