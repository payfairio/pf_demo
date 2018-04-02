<template>
    <div class="view_all_notifications">
        <h1 v-if="!notifications.length">You don't have notifications</h1>
        <h1 v-else>You have {{ notifications.length }} notifications</h1>
        <ul id="list_notifications">
            <li class="new_item" v-for="notification in notifications" v-if="!notification.viewed">
                <b-dropdown-item  v-bind:key="notification._id" @click="$router.push({name: 'deal', params: {id: notification.deal.dId}})">
                        <div  :class="'title new'">
                        {{getNotificationTitle(notification)}}
                        <div class="time">
                            <small v-if="isToday(notification.created_at)">Today, {{notification.created_at | moment("HH:mm:ss")}}</small>
                            <small v-if="!isToday(notification.created_at)">{{notification.created_at | moment("MM.D, HH:mm:ss")}}</small>
                        </div>
                    </div>
                    <div class="text">
                        {{getNotificationText(notification)}}
                    </div>
                </b-dropdown-item>
            </li>
            <li v-for="notification in notifications" v-if="notification.viewed">
                <div  v-bind:key="notification._id" @click="$router.push({name: 'deal', params: {id: notification.deal.dId}})">
                    <div  :class="'title'">
                        {{getNotificationTitle(notification)}}
                        <div class="time">
                            <small v-if="isToday(notification.created_at)">Today, {{notification.created_at | moment("HH:mm:ss")}}</small>
                            <small v-if="!isToday(notification.created_at)">{{notification.created_at | moment("MM.D, HH:mm:ss")}}</small>
                        </div>
                    </div>
                    <div class="text">
                        {{getNotificationText(notification)}}
                    </div>
                </div>
            </li>
        </ul>
    </div>
</template>
<script>
    export default {
        name: 'view_all_notifications',
        data: () => {
            return {
                notifications: []
            }
        },
        created: function(){
            this.getNotifications();
        },
        sockets: {
            connect: function() {
                this.$socket.emit('authenticate', {token: this.$auth.token() ? this.$auth.token().substr(4) : ''});
            },
            disconnect: function () {
                this.socketReady = false;
                console.log('socket disconnected');
            },
            authorized: function () {
                this.socketReady = true;
                this.getNotifications();
            },
            unauthorized: function () {
                console.log('socket unauthorized');
                this.$socket.disconnect();
            },
            refresh: function () {
                location.reload();
            },
            notification: function (data) {
                let flag = true;
                if (data.type === 'message') {
                    data.notifications = 1;
                    for (let notif of this.notifications) {
                        if (notif.deal._id ==  data.deal._id && notif.type === data.type) {
                            notif.notifications++;
                            this.uncheckedNotifications--;
                            flag = false;
                            break;
                        }
                    }
                }
                if (flag) {
                    this.notifications.unshift(data);
                }
                this.newNotifications.unshift(data);
                this.uncheckedNotifications++;
                const route = this.$router.currentRoute;
                if (route.name !== 'deal' || route.params.id !== data.deal.dId) {
                    this.showNotification = true;
                }
                /*if (this.notifications.messages.hasOwnProperty(data.deal)) {
                 this.notifications.messages[data.deal].count++;
                 } else {
                 this.notifications.messages[data.deal] = {
                 count: 1
                 };
                 this.notificationsCount++;
                 }*/
            },
            notifications: function (data) {
                this.notifications = data;
                this.uncheckedNotifications = 0;
                this.notifications.map((n) => !n.viewed ? this.uncheckedNotifications++ : false);
            }
        },
        methods: {
            sendVerifyCode: function () {
                this.$http
                    .get('/users/sendVerify')
                    .then((response) => {
                        this.$swal('Success', response.data.msg, 'success');
                    })
                    .catch((error) => {
                        if (error.status == 400) {
                            this.$swal('Error', response.data.msg, 'error');
                        }
                    });
            },
            updateBalance: function () {
                const balances = this.$auth.user().balances;
                const holds = this.$auth.user().holds;
                for (let i in balances) {
                    this.balance[i].total = balances[i];
                    this.balance[i].hold = holds[i];
                }
            },
            getBalances: function () {
                const balances = this.$auth.user().balances;
                const holds = this.$auth.user().holds;
                const balance = {};
                for (let i in balances) {
                    if (!balances.hasOwnProperty(i)) {
                        continue;
                    }
                    balance[i] = {};
                    balance[i].total = balances[i];
                    balance[i].hold = holds[i];
                }
                return balance;
            },
            appLogout: function (e) {
                e.preventDefault();
                this.$socket.emit('logout');
                this.$auth.logout({
                    makeRequest: false,
                    data: {},
                    success: function () {},
                    error: function () {},
                    redirect: '/',
                });
            },
            showNotifications: function (e) {
                e.preventDefault();
                this.notificationsVisible = true;
            },
            noitfTimer: function (notif) {
                const vm = this;
                setTimeout(function () {
                    if (vm.newNotifications.indexOf(notif) != -1) {
                        vm.newNotifications.splice(vm.newNotifications.indexOf(notif), 1);
                    }
                }, 5000);
            },
            isToday(date) {
                date = new Date(date);
                return new Date().toLocaleDateString() === date.toLocaleDateString();
            },

            markAllUnreadNotification: function (){
                const vm = this;
                this.$http.post('/users/notifications')
                    .then(
                        function(response) {
                        vm.uncheckedNotifications = 0;
                        vm.notifications.map((n) => n.viewed = true);
                        console.log(response)
                    },
                    function (err) {
                        console.log(err);
                    }
                )

            },

            getNotifications: function () {
                const vm = this;
                this.$http
                    .get('/users/notifications')
                    .then(function (response) {
                    vm.notifications = response.data;
                    //vm.uncheckedNotifications = 0;
                    //vm.notifications.map((n) => !n.viewed ? vm.uncheckedNotifications++ : false);
                }, function (err) {
                    console.log(err);
                });
            },
            getNotificationTitle: function (notification) {
                let titles = {
                    newDeal: 'New deal',
                    message: 'New message',
                    dealFromExchange: 'New deal',
                    changeDealConditions: 'New conditions',
                    dealConditionsAccepted: 'Conditions accepted',
                    changeDealSum: 'Deal sum changed',
                    dealCompleted: 'Deal completed'
                };
                return titles[notification.type];
            },
            getNotificationText: function (notification) {
                let result = '';
                switch (notification.type) {
                    case 'newDeal' : {
                        result = 'You have new deal: ' + notification.deal.name
                    } break;
                    case 'message' : {
                        result = 'You have ' + notification.notifications + ' unread messages in deal ' + notification.deal.name
                    } break;
                    case 'dealFromExchange' : {
                        result = notification.sender.username + ' responded to your ' + notification.deal.exchange.tradeType +' - ' + notification.deal.name
                    } break;
                    case 'changeDealConditions' : {
                        result = notification.sender.username + ' changed conditions in deal ' + notification.deal.name
                    } break;
                    case 'dealConditionsAccepted' : {
                        result = notification.sender.username + ' accepted conditions in deal ' + notification.deal.name
                    } break;
                    case 'changeDealSum' : {
                        result = notification.sender.username + ' change deal sum to ' + notification.deal.sum + ' ' + notification.deal.coin + ' in deal ' + notification.deal.name
                    } break;
                    case 'dealCompleted' : {
                        result = notification.deal.name + ' was completed';
                    } break;
                }
                return result;
            },
            getNotificationMessage: function (notification) {
                function getPartOfText (text) {
                    return text.length > 75 ? text.substr(0, 75) + '...' : text 
                }
                /**
                 * notifications types:
                 * newDeal - create new deal
                 * message - get new message in deal
                 * dealFromExchange - new deal from exchange
                 * changeDealConditions - change deal conditions
                 * ...
                 */
                let messages = {
                    newDeal: [
                        {
                            name: 'Deal',
                            link: {
                                name: 'deal',
                                params: {
                                    id: notification.deal.dId
                                }
                            },
                            text: notification.deal.name
                        },
                        {
                            name: 'Counterparty',
                            link: {
                                name: 'user-by-id',
                                params: {
                                    id: notification.sender._id
                                }
                            },
                            text: notification.sender.username
                        },
                        {
                            name: 'Message',
                            text: `You have new deal: ${notification.deal.name}`
                        }
                    ],
                    message: [
                        {
                            name: 'Deal',
                            link: {
                                name: 'deal',
                                params: {
                                    id: notification.deal.dId
                                }
                            },
                            text: notification.deal.name
                        },
                        {
                            name: 'From',
                            link: {
                                name: 'user-by-id',
                                params: {
                                    id: notification.sender._id
                                }
                            },
                            text: notification.sender.username
                        },
                        {
                            name: 'Message',
                            text: getPartOfText(notification.text)
                        }
                    ],
                    dealFromExchange: [
                        {
                            name: 'Deal',
                            link: {
                                name: 'deal',
                                params: {
                                    id: notification.deal.dId
                                }
                            },
                            text: notification.deal.name
                        },
                        {
                            name: 'Counterparty',
                            link: {
                                name: 'user-by-id',
                                params: {
                                    id: notification.sender._id
                                }
                            },
                            text: notification.sender.username
                        },
                        {
                            name: 'Message',
                            text: `You have new deal: ${notification.deal.name}`
                        }
                    ],
                    changeDealConditions: [
                        {
                            name: 'Deal',
                            link: {
                                name: 'deal',
                                params: {
                                    id: notification.deal.dId
                                }
                            },
                            text: notification.deal.name
                        },
                        {
                            name: 'Conditions',
                            text: getPartOfText(notification.text)
                        }
                    ],
                    dealConditionsAccepted: [
                        {
                            name: 'Deal',
                            link: {
                                name: 'deal',
                                params: {
                                    id: notification.deal.dId
                                }
                            },
                            text: notification.deal.name
                        },
                        {
                            name: 'Message',
                            text: notification.sender.username + ' accepted your conditions conditions'
                        }
                    ],
                    changeDealSum: [
                        {
                            name: 'Deal',
                            link: {
                                name: 'deal',
                                params: {
                                    id: notification.deal.dId
                                }
                            },
                            text: notification.deal.name
                        },
                        {
                            name: 'Message',
                            text: notification.sender.username + ' change deal sum to ' + notification.deal.sum + ' ' + notification.deal.coin + ' in deal ' + notification.deal.name
                        }
                    ],
                    dealCompleted: [
                        {
                            name: 'Deal',
                            link: {
                                name: 'deal',
                                params: {
                                    id: notification.deal.dId
                                }
                            },
                            text: notification.deal.name
                        },
                        {
                            name: 'Message',
                            text: notification.sender.username + ' accept deal ' + notification.deal.name
                        }
                    ]
                };
                return messages[notification.type] || [];
            }
        },
    }
</script>

<style scoped>
    /*for header*/
    .view_all_notifications h1{
        margin: 1em 0em 0.5em 0em;
    }
    #list_notifications{
        list-style: none;
    }
    #list_notifications{
        margin: 0;
        padding: 5px 10px;
    }
    #list_notifications li{
        margin: 10px 0;
        padding: 5px 10px;
        box-shadow: 0 3px 5px 0px rgba(190, 195, 198, 0.36);
        background-color: #fff;
    }
    #list_notifications li:hover{
        background-color: #f8f9fa;
        cursor: pointer;
    }
    #list_notifications li a{
        margin: 0;
        padding: 0;
        background-color: none;
        cursor: pointer;
    }
    #list_notifications .new_item{
        background: red;
    }
</style>
