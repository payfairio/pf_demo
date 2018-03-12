const Deal = require('../db/models/Deal.js');
const User = require('../db/models/User.js');
const Notification = require('../db/models/Notification.js');

const settings = require('../config/settings')('bcg-escrows');

const sendNotification = async (notification, io) => {
    notification = await Notification
        .findById(notification)
        .populate('deal');

    const clients = io.clients[notification.user];
    if (clients) {
        for (let client of clients) {
            io.to(client).emit('notification', notification);
        }
    }
}

module.exports = io => {
    setInterval(async () => {
        try {
            const deals = await Deal.find({ status: 'dispute' }).sort({created_at: -1});

            deals.forEach(async (deal, index) => {
                if (deal.escrows.length) {
                    let lastEscrow = deal.escrows[deal.escrows.length - 1];
                    let created_at = new Date(lastEscrow.created_at);
                    let join_at = new Date(lastEscrow.join_at);
                    let now = new Date();
    
                    if ((join_at.getTime() == 0 && Math.floor(now - created_at) > settings.time_from_add * 1000) || 
                        (join_at.getTime() != 0 && Math.floor(now - join_at) > settings.time_from_join * 1000)) {
                        deal.escrows.id(lastEscrow._id).set({decision: 'rejected'});

                        let used_ids = deal.escrows.map(function (escrow) { //find escrows in deal
                            return escrow.escrow;
                        });

                        let escrows = await User.find({ // find escrows not in deal
                            $and: [
                                {type: 'escrow'},
                                {_id: {$nin: used_ids}}
                            ]
                        });

                        if (escrows && escrows.length > 0) {
                            let timesOutNotification = await new Notification({
                                user: lastEscrow.escrow,
                                deal: deal._id,
                                type: 'disputeTimesOut',
                                text: 'Times to resolve dispute is out'
                            }).save();
                            sendNotification(timesOutNotification, io);
                            
                            let random = Math.floor(Math.random() * escrows.length);
                            deal.escrows.push({escrow: escrows[random]._id}); // set new random escrow
                            await deal.save();

                            let user = deal.escrows[deal.escrows.length - 1].escrow;

                            let notification = await new Notification({
                                user: user,
                                deal: deal._id,
                                type: 'dispute',
                                text: 'You need to resolve dispute'
                            }).save();

                            sendNotification(notification, io);

                            io.in(deal._id.toString()).emit('disputeChanged');
                        }
                    }
                }
            });
        } catch (err) {
            console.log(err);
        }
    }, 1000 * settings.time_to_check);
}