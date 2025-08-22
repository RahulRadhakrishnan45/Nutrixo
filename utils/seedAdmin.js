const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const Admin = require('../models/adminSchema')
const dotenv=require('dotenv')

dotenv.config()

const seedAdmin=async () => {
     console.log('Started seeding');
     
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser:true,
            useUnifiedTopology:true,
        })

        const existingAdmin = await Admin.findOne({email:'rahulkrishna1595@gmail.com'})
        if(existingAdmin) {
            console.log('Admin already exists. Skipping creation') 
            process.exit(0)
        } 

        const passwordHash = await bcrypt.hash('admin123',10)

        const newAdmin = new Admin({
            name:'Super Admin',
            email:'rahulkrishna1595@gmail.com',
            password:passwordHash
        })

        await newAdmin.save()
        console.log('Admin created successfully')
        
        process.exit(1)

    } catch (err) {
        console.log('Error seeding admin', err)
        process.exit(1)
    }
}


module.exports = seedAdmin