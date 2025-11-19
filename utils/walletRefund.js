const Wallet = require('../models/walletSchema')

async function creditToWallet(userId,amount,description,orderId=null) {
    let wallet = await Wallet.findOne({user_id:userId})
    if(!wallet) {
        wallet = new Wallet({
            user_id:userId,
            balance:0,
            transactions:[]
        })
    }

    wallet.balance += amount

    wallet.transactions.push({
        amount:amount,
        type:'REFUND',
        description,
        orderId
    })

    await wallet.save()
    return wallet
}

module.exports = {creditToWallet}
