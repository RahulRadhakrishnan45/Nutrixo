const {createLogger,format,transports} = require('winston')
const {combine,timestamp,printf,colorize} = format

const logFormat = printf(({level,message,timestamp}) => {
    return `${timestamp} [${level}] : ${message}`
})

const apiLog = createLogger({
    level:'info',
    format:combine(
        colorize(),
        timestamp({format:'YYYY-MM-DD HH:mm:ss'}),
        logFormat
    ),
    transports:[
        new transports.Console(),
        new transports.File({filename:'logs/api.log'})
    ]
})

const errorLog = createLogger({
    level:'error',
    format:combine(
        timestamp({format:'YYYY-MM-DD HH:mm:ss'}),
        logFormat
    ),
    transports:[
        new transports.Console(),
        new transports.File({filename:'logs/error.log'})
    ]
})

module.exports = {apiLog,errorLog}