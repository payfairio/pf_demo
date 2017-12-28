const Deal = require('../db/models/Deal.js');
const User = require('../db/models/User.js');

const settings = require('../config/settings')('bcg-escrows');

function findAndChangeEscrows(deal) {
    let used_ids = deal.escrows.map(function (escrow) {
        return escrow.escrow;
    });
    return new Promise(function(resolve, reject){
        User.find({
            $and: [
                {type: 'escrow'},
                {_id: {$nin: used_ids}}
            ]
        }).then(function(escrows){
            if (escrows && escrows.length > 0) {
                let random = Math.floor(Math.random() * escrows.length);
                deal.escrows.push({escrow: escrows[random]._id});
            }
            return deal.save();
        }).then(function (deal){
            resolve(deal);
        }).catch(function(err){
            reject(err);
        });
    })
}

module.exports = function(io){
    setInterval(function(){
        Deal.find({
            status: 'dispute'
        }).then(function (deals){
            let _deals = [];
            deals.forEach(function(deal, index){
                if (deal.escrows.length){
                    let lastEscrow = deal.escrows[deal.escrows.length - 1];
                    let created_at = new Date(lastEscrow.created_at);
                    let join_at = new Date(lastEscrow.join_at);
                    let now = new Date();

                    if ((join_at.getTime() == 0 && Math.floor(now - created_at) > settings.time_from_add * 1000) || 
                        (join_at.getTime() != 0 && Math.floor(now - join_at) > settings.time_from_join * 1000)){
                        deal.escrows.id(lastEscrow._id).set({decision: 'rejected'});
                        findAndChangeEscrows(deal).then(function(deal){
                            io.in(deal._id.toString()).emit('disputeChanged');
                        }).catch(function (err){
                            console.log(err);  
                        });
                    }
                }
            });
        }).catch(function (err){
            console.log(err);
        });
    }, 1000 * settings.time_to_check);
};