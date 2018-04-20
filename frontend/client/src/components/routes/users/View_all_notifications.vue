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
        methods: {
            isToday(date) {
                date = new Date(date);
                return new Date().toLocaleDateString() === date.toLocaleDateString();
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
                    changeDealRate: 'Deal rate changed',
                    dealCompleted: 'Deal completed'
                };
                return titles[notification.type];
            },
            getNotificationText: function (notification) {
                try{
                    let result = '';
                    if (notification.deal === null) return result;
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
                        case 'changeDealRate' : {
                            result = notification.sender.username + ' change deal rate to ' + notification.deal.rate + ' ' + notification.deal.currency + ' in deal ' + notification.deal.name
                        } break;
                        case 'dealCompleted' : {
                            result = notification.deal.name + ' was completed';
                        } break;
                        case 'dealCanseled' : {
                            result = notification.deal.name + ' was canceled';
                        } break;
                    }
                    return result;
                }
                catch (e) {
                    return '';
                }

            },
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
