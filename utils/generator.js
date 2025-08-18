const nodemailer = require('nodemailer')

function generateOtp() {
    return Math.floor(100000 + Math.random()*900000).toString();
}

async function sendVerificationEmail(email,otp) {
    try {
        
        const transporter = nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:'Verify your Account',
            text:`Your OTP is ${otp}`,
            html:`<b><h4>Your OTP : ${otp}<h4></b>`
        })

        if (info.accepted.length > 0) {

            console.log('Email successfully sent to:', email);
            return true

        } else {

            console.log('Failed to send email to:', email);
            return false

        }

    } catch (error) {
        console.error('Error sending email',error)
        return false
    }
}


module.exports = {generateOtp,sendVerificationEmail}