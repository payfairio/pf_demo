<template>
    <div id="app">
        <div class="wrap">
            <div class="demo-topbar">This is just demo on ropsten testnet. Don't use this app for real trades. <a href="https://ropsten.etherscan.io">etherscan for ropsten</a> <br>
                Replenishment of the balance can be a delay of up to 3 hours.
            </div>
            <b-navbar toggleable="md" type="dark" variant="gray">
                <b-navbar-brand :to="'/'"><img :src="$config.staticUrl+'/images/pfr_logo.svg'" alt="PayFair"></b-navbar-brand>

                <b-nav-toggle target="nav_collapse"></b-nav-toggle>
                <b-collapse is-nav id="nav_collapse">
                    <b-nav-item v-if="$auth.check()" :to="{name: 'disputes', path: '/'}">Disputes</b-nav-item>
                    <b-nav is-nav-bar class="ml-auto">

                        <b-nav-item-dropdown v-if="$auth.check() && $auth.user().statusEscrowBool === true" @click="showNotifications" @hide="markAllUnreadNotification" id="notifdown" class="ntf">

                            <template slot="button-content">
                                <span id="notify"><span>{{uncheckedNotifications}}</span></span>
                            </template>
                            <b-dropdown-header>Notifications</b-dropdown-header>
                            <div class="notif-body">
                                <b-dropdown-header v-if="!notifications.length">You don't have notifications</b-dropdown-header>

                                <!--New notifications-->
                                <template v-for="notification in notifications" v-if="!notification.viewed">
                                    <b-dropdown-item  v-bind:key="notification._id" @click="$router.push({name: 'dispute', params: {id: notification.deal.dId}})">

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
                                </template>

                                <b-dropdown-divider></b-dropdown-divider>
                                <b-dropdown-item :to="{name: 'view_all_notifications'}" >View all</b-dropdown-item>
                            </div>
                        </b-nav-item-dropdown>

                        <b-nav-item-dropdown v-if="$auth.check() && $auth.ready()" right>
                            <template slot="button-content">
                                <span>Wallet</span>
                            </template>
                            <div class="currencies">
                                <div class="currency currency-header">
                                    <span>Currency</span>
                                    <span class="right">
                                        <span class="total">Total</span>
                                        <span class="hold">(hold)</span>
                                    </span>
                                </div>
                                <div v-for="(value, name) in getBalances()" class="currency">
                                    <span>{{name}}</span>
                                    <span class="right">
                                        <span class="total">{{value.total}}</span>
                                        <span class="hold">({{value.hold}})</span>
                                    </span>
                                </div>
                            </div>
                            <b-dropdown-item :to="{name: 'wallet'}" class="text-center orng-btn">Show wallet</b-dropdown-item>
                        </b-nav-item-dropdown>

                        <b-nav-item-dropdown v-if="$auth.check()" right>
                            <template slot="button-content">
                                <div class="nav-profile-card">
                                    <img :src="$auth.user().profileImg">
                                    <span>{{ $auth.user().username }}</span>
                                </div>
                            </template>
                            <b-dropdown-item :to="{name: 'profile'}">Profile</b-dropdown-item>
                            <b-dropdown-item v-on:click="appLogout">Logout</b-dropdown-item>
                        </b-nav-item-dropdown>

                        <b-nav-item v-if="!$auth.check()" :to="{name: 'login'}">Login</b-nav-item>
                        <b-nav-item v-if="!$auth.check()" :to="{name: 'register'}">Register</b-nav-item>
                    </b-nav>
                </b-collapse>
            </b-navbar>
            <div id="app-content-container">
                <div v-if="$auth.ready() && (socketReady || !$auth.check())">
                    <!-- <b-alert variant="info"
                        dismissible
                        :show="showNotification"
                        @dismissed="showNotification=false">
                        <router-link :to="{name: 'deal', params: {id: notification.id}}"><span @click="showNotification=false">{{notification.message}}</span></router-link>
                    </b-alert> -->

                    <div id="new-notifics" v-if="$auth.user().statusEscrowBool === true">
                        <div class="notification" v-for="notif in newNotifications" v-bind:key="notif._id" @click="noitfTimer(notif)">
                            <div class="notification-header">
                                {{getNotificationTitle(notif)}}
                                <span class="close" @click="newNotifications.splice(newNotifications.indexOf(notif), 1)">×</span>
                            </div>
                            <div class="notification-body">
                                <template v-for="item in getNotificationMessage(notif)">
                                    {{item.name}}: <router-link v-if="item.link" :to="item.link">{{item.text}}</router-link>{{!item.link ? item.text : ''}}<br>
                                </template>
                                <div class="time">
                                    <small v-if="isToday(notif.created_at)">Today, {{notif.created_at | moment("HH:mm:ss")}}</small>
                                    <small v-if="!isToday(notif.created_at)">{{notif.created_at | moment("MM.D, HH:mm:ss")}}</small>
                                </div>
                            </div>
                        </div>
                        <div v-if="newNotifications.length > 1" class="hide-notif" @click="newNotifications = []">
                            Hide All
                        </div>
                    </div>

                    <div class="container" v-if="$auth.user().status === 'unverified'">
                        <div class="welcome">
                            <b-row align-h="center">
                                <b-col sm="12">
                                    <div class="wel-inner text-center">
                                        <h3>Hello, {{$auth.user().username}}</h3>
                                        <p>Please check email and verify your account.</p>
                                        <b-btn @click="sendVerifyCode" variant="info">Send verification email again</b-btn>
                                    </div>
                                </b-col>
                            </b-row>
                        </div>
                    </div>

                    <div class="container" v-if="$auth.user().statusEscrowBool === false">
                        <div class="welcome">
                            <b-row align-h="center">
                                <b-col sm="12">
                                    <div class="wel-inner text-center">
                                        <a style="font-weight: bolder">Your wallet does not contain enough Payfair Tokens to provide escrow services. You require $250</a>
                                    </div>
                                </b-col>
                            </b-row>
                        </div>
                    </div>

                    <router-view></router-view>
                </div>
                <div class="container" v-if="!$auth.ready() || (!socketReady && $auth.check())">
                    Loading ...
                </div>
            </div>
        </div>
        <footer class="footer">
            <div class="container">
                <div class="footer-dashboard-links">
                    <ul>
                        <li><a target="_blank" href="https://payfair.io">Client-node dashboard</a></li>
                        <li><a target="_blank" href="https://trust.payfair.io">Trust-node dashboard</a></li>
                    </ul>
                </div>
            </div>
        </footer>
        <div class="loader-wrap" v-if="loading || (!$auth.ready() || (!socketReady && $auth.check()))">
            <pulse-loader :loading="loading" ></pulse-loader>
        </div>
    </div>
</template>

<script>
    import PulseLoader from 'vue-spinner/src/PulseLoader.vue'
    export default {
        name: 'app',
        components: {
            PulseLoader
        },



        data: function () {
            return {
                loading: false,
                notification: '',
                notifications: [],
                showNotification: false,
                notificationsCount: 0,
                notificationsVisible: false,
                socketReady: false,
                uncheckedNotifications: 0,
                balance: {
                    pfr: {total: 0, hold: 0},
                    eth: {total: 0, hold: 0}
                },
                newNotifications: []
            }
        },
        created: function(){
            document.body.style.overflow = 'initial';
        },
        mounted() {
            this.$events.on('loadingStart', eventData => {this.loading = true;});
            this.$events.on('loadingEnd', eventData => {this.loading = false;});
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
                this.checkWallet();
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
                        if (notif.deal._id === data.deal._id && notif.type === data.type) {
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
            //confirmWallet
            checkWallet: function () {
                const vm = this;
                this.$http.post('/wallet/addConfirmWallet').then( function (res) {
                }, function (err) {
                    if (vm.$auth.check()) {
                        vm.$swal('Warning', 'You require a minimum of $250 in your account to provide escrow services!', 'warning');
                    }
                });
            },

            sendVerifyCode: function () {
                this.$http
                    .get('/users/sendVerify')
                    .then((response) => {
                        this.$swal('Success', response.data.msg, 'success');
                    })
                    .catch((error) => {
                        if (error.status == 400) {
                            this.$swal('Error', error.data.msg, 'error');
                        }
                    });
            },
            updateBalance: function(){
                const balances = this.$auth.user().balances;
                const holds = this.$auth.user().holds;
                for (var i in balances) {
                    this.balance[i].total = balances[i];
                    this.balance[i].hold = holds[i];
                }
            },
            getBalances: function () {
                const balances = this.$auth.user().balances;
                const holds = this.$auth.user().holds;
                let balance = {};
                for (var i in balances){
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
                    redirect: '/login',
                });
            },
            showNotifications: function (e) {
                e.preventDefault();
                this.notificationsVisible = true;
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
            getNotifications: function () {
                const vm = this;
                this.$http
                    .get('/users/notifications')
                    .then(function (response) {
                        vm.notifications = response.data;
                        vm.uncheckedNotifications = 0;
                        vm.notifications.map((n) => !n.viewed ? vm.uncheckedNotifications++ : false);
                    }, function (err) {
                        console.log(err);
                    });
            },
            getNotificationTitle: function (notification) {
                let titles = {
                    dispute: "New Dispute",
                    message: 'New message',
                    disputeTimesOut: 'Times out'
                };
                return titles[notification.type];
            },
            getNotificationText: function (notification) {
                let result = '';
                switch (notification.type) {
                    case 'dispute': {
                        result = `You need to resolve dispute in deal: ${notification.deal.name}`
                    } break;
                    case 'message' : {
                        result = 'You have ' + notification.notifications + ' unread messages in deal ' + notification.deal.name
                    } break;
                    case 'disputeTimesOut': {
                        result = `Times to resolve dispute is out in deal: ${notification.deal.name}`
                    } break;
                }
                return result;
            },
            getNotificationMessage: function (notification) {
                function getPartOfText (text) {
                    return text.length > 75 ? text.substr(0, 75) + '...' : text 
                }
                let result = [];
                switch (notification.type) {
                    case 'dispute': {
                        result = [
                            {
                                name: 'Deal',
                                link: {
                                    name: 'dispute',
                                    params: {
                                        id: notification.deal.dId
                                    }
                                },
                                text: notification.deal.name
                            },
                            {
                                name: 'Message',
                                text: `You need to resolve dispute in deal: ${notification.deal.name}`
                            }
                        ]
                    } break;
                    case 'disputeTimesOut': {
                        result = [
                            {
                                name: 'Deal',
                                link: {
                                    name: 'dispute',
                                    params: {
                                        id: notification.deal.dId
                                    }
                                },
                                text: notification.deal.name
                            },
                            {
                                name: 'Message',
                                text: `Times to resolve dispute is out in deal: ${notification.deal.name}`
                            }
                        ]
                    } break;
                    case 'message': {
                        result = [
                            {
                                name: 'Deal',
                                link: {
                                    name: 'dispute',
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
                        ]
                    } break;
                }
                return result;
            }
        },
        watch: {
        }
    }
</script>
<style>
    .container, .container-fluid {
        margin-top: 40px;
    }
    .footer .container {
        margin-top: 0;
    }
    html, body {
        height: 100%;
    }
    img {
        max-width: 100%;
    }
    .disable-selection {
        -moz-user-select: -moz-none;
        -khtml-user-select: none;
        -webkit-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }

    #app {
        height: 100%;
    }
    .demo-topbar {
        background: #f90;
        padding: 10px 0;
        text-align: center;
        color: #fff;
    }
    .demo-topbar a {
        font-weight: bold;
        color: #fff;
        text-decoration: underline;
    }
    .demo-topbar a:hover {
        text-decoration: none;
        cursor: pointer;
    }
    .wrap {
        min-height: 100%;
        height: auto;
        margin: 0 auto -63px;
        padding: 0 0 63px;
    }
    li.nav-item {
        display: flex;
        align-items: center;
    }
    .b-nav-dropdown {
        margin-left: 15px;
    }
    .nav-profile-card {
        display: inline-block;
    }
    .nav-profile-card img {
        border-radius: 100%;
        background: #636b6f;
    }

    .profile-card {
        text-align: center;
    }
    .profile-card img {
        border-radius: 100%;
        border: 2px solid #ececec;
        background: #636b6f;
        width: 256px;
    }

    .footer-dashboard-links ul {
        margin: 0;
        padding: 0;
        list-style: none;
        text-align: center;
    }
    .footer-dashboard-links ul li {
        margin: 0 15px;
        display: inline-block;
    }

    .footer {
        background-color: #f5f5f5;
        border-top: 1px solid #ddd;
        padding-top: 20px;
        padding-bottom: 20px;
    }
    .footer-links {
        text-align: center;
    }
    .footer-links a {
        font-size: 15px;
    }
    .currency {
        clear: both;
        padding: 5px 10px;
        border-top: 1px solid #dedede;
    }
    .currency-header{
        font-size: 12px;
    }
    .currency:last-child{
        border-bottom: 1px solid #dedede;
    }
    .right{
        float: right;
    }
    .currencies{
        width: 250px;
        margin-bottom: 10px;
    }

    #notifdown .dropdown-toggle::after{
        content: none;
    }
    #notifdown .dropdown-menu{
        left: auto;
        right: -20px;
    }
    #notifdown .dropdown-item:focus,
    #notifdown .dropdown-item:hover{
        background-color: inherit;
        color: inherit;
    }
    #notifdown > .dropdown-menu {
        max-height: 200px;
        width: 300px;
    }
    #notifdown > .dropdown-menu > .notif-body > .dropdown-item {
        white-space: normal;
        outline: none;
    }
    #notifdown .dropdown-header {
        box-shadow: 0 3px 3px #dedede;
        margin-bottom: 1px;
    }
    #notifdown .dropdown-item .title {
        font-size: 16px;
        position: relative;
    }
    #notifdown .dropdown-item .title .time {
        position: absolute;
        top: 0px;
        right: -10px;
        font-size: 14px;
        color: #7e7e7e;
    }
    #notifdown .dropdown-item .text {
        font-size: 14px;
        color: #777;
    }
    #notifdown .dropdown-item:not(:last-child) {
        border-bottom: 1px solid #dedede;
    }
    .notif-body {
        overflow-y: auto;
        position: relative;
        max-height: calc(167px - 0.3rem);
    }
    #notifdown .title.new:after {
        content: '';
        width: 8px;
        height: 8px;
        background: #47e2ce;
        display: inline-block;
        border-radius: 100%;
    }
    #new-notifics {
        position: fixed;
        left: 20px;
        bottom: -10px;
        width: 300px;
        z-index: 10;
    }
    .notification {
        background: #fff;
        box-shadow: 0 0 10px #999;
        margin-bottom: 20px;
    }
    .notification-header {
        padding: 10px;
        background: #53e5d3;
        color: #fff;
    }
    .notification .close {
        line-height: 0.5;
        color: #777;
        cursor: pointer;
    }
    .notification-body {
        padding: 10px;
    }
    .hide-notif {
        padding: 5px;
        margin-bottom: 20px;
        background: #7ae1d2;
        font-size: 16px;
        text-align: center;
        color: #fff;
        cursor: pointer;
        box-shadow: 0 0 10px #999;
    }
    .hide-notif:hover {
        box-shadow: 0 0 10px #666;
    }

    /*temporary*/
    .container-about {
        max-width: 100%!important;
        padding-top: 0 !important;
        padding-right: 0;
        padding-left: 0;
    }

    .ab-container{
        padding-right: 15px;
        padding-left: 15px;
        margin-right: auto;
        margin-left: auto;
    }
    @media (min-width: 576px){
        .ab-container {
            max-width: 540px;
        }
    }
    @media (min-width: 768px){
        .ab-container {
            max-width: 720px;
        }
    }
    @media (min-width: 992px){
        .ab-container {
            max-width: 960px;
        }
    }
    @media (min-width: 1200px){
        .ab-container {
            max-width: 1140px;
        }
    }
</style>