<template>
    <div id="app">
        <div class="wrap">
            <div class="demo-topbar">This is just demo on ropsten testnet. Don't use this app for real trades. <a href="https://ropsten.etherscan.io">etherscan for ropsten</a></div>
            <b-navbar toggleable="md" type="dark" variant="gray">
                <b-navbar-brand :to="'/'"><img :src="$config.backendUrl+'/images/pfr_logo.svg'" alt="PayFair"></b-navbar-brand>

                <b-nav-toggle target="nav_collapse"></b-nav-toggle>
                <b-collapse is-nav id="nav_collapse">
                    <b-nav is-nav-bar class="ml-auto">
                        <b-nav-item v-if="false && $auth.check()" v-on:click="showNotifications" class="ntf"><span id="notify">{{this.notifications.length}}</span></b-nav-item>

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
            <div class="container" id="app-content-container">
                <div v-if="$auth.ready() && (socketReady || !$auth.check())">
                     <b-alert variant="info"
                        dismissible
                        :show="showNotification"
                        @dismissed="showNotification=false">
                        <router-link :to="{name: 'deal', params: {id: notification.id}}"><span @click="showNotification=false">{{notification.message}}</span></router-link>
                    </b-alert>
                    <router-view></router-view>
                </div>
                <div v-if="!$auth.ready() || (!socketReady && $auth.check())">
                    Loading ...
                </div>
            </div>
        </div>
        <footer class="footer">
            <div class="container">
                <div class="coinmarket_inner">
                    <div class="coinmarketcap-currency-widget" data-currency="payfair" data-base="ETH" data-secondary="USD" data-ticker="true" data-rank="true" data-marketcap="true" data-volume="true" data-stats="USD" data-statsticker="false"></div>
                </div>
                <hr>
                <div class="firstscreen_market">
                    <h4 class="text-center">You can buy/sell PFR token here:</h4>
                    <div class="bir-list">
                        <a href="https://etherdelta.com/#PFR-ETH" target="_blank" class="bir_item item-1"><img :src="$config.backendUrl + '/images/bir/ether_delta.jpg'" alt=""></a>
                        <a href="https://idex.market/eth/pfr" target="_blank" class="bir_item item-2"><img :src="$config.backendUrl + '/images/bir/idex.jpg'" alt=""></a>
                        <a href="https://stocks.exchange/trade/PFR/BTC" target="_blank" class="bir_item item-3"><img :src="$config.backendUrl + '/images/bir/stocks_exchange.jpg'" alt=""></a>
                    </div>
                </div>
                <hr>
                <div class="row footer-row">
                    <b-col sm="12" md="3">
                        <a href="/">PayFair</a>
                    </b-col>
                    <b-col sm="12" md="3">
                        <ul class="footer-menu">
                            <li><b>Buy PFR</b></li>
                            <li><a href="https://etherdelta.com/#PFR-ETH" target="_blank">EtherDelta</a></li>
                            <li><a href="https://idex.market/eth/pfr" target="_blank">IDEX</a></li>
                            <li><a href="https://stocks.exchange/trade/PFR/BTC" target="_blank">Stocks Exchange</a></li>
                        </ul>
                    </b-col>
                    <b-col sm="12" md="3">
                        <ul class="footer-menu">
                            <li><b>About us</b></li>
                            <li><a href="https://payfair.io/whitepapers/full_PF.pdf">White Paper</a></li>
                            <li><a href="https://payfair.io/#team">Team</a></li>
                            <li><a href="https://payfair.io/ru/blog">Blog</a></li>
                            <li><a href="https://payfair.io/ru/about">About</a></li>
                        </ul>
                    </b-col>
                    <b-col sm="12" md="3">
                        <ul class="footer-menu">
                            <li><b>Follow us</b></li>
                            <li><a href="https://t.me/payfair">Telegram</a></li>
                            <li><a href="https://twitter.com/payfairio">Twitter</a></li>
                            <li><a href="https://www.facebook.com/Payfairio/">Facebook</a></li>
                            <li><a href="https://vk.com/iopayfair">VK</a></li>
                        </ul>
                    </b-col>
                </div>
            </div>
        </footer>
    </div>
</template>

<script>

    export default {
        name: 'app',
        data: function () {
            return {
                notification: '',
                notifications: [],
                showNotification: false,
                notificationsCount: 0,
                notificationsVisible: false,
                socketReady: false,
                balance: {
                    pfr: {total: 0, hold: 0},
                    eth: {total: 0, hold: 0}
                }
            }
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
            },
            unauthorized: function () {
                console.log('socket unauthorized');
                this.$socket.disconnect();
            },
            refresh: function () {
                location.reload();
            },
            notification: function (data) {
                console.log(data);
                if (data.type === 'deal') {
                    this.notifications.push(`New deal: ${data.text}`);
                    this.notification = {
                        message: `New deal: ${data.text}`,
                        id: data.deal.dId
                    };
                } else if (data.type === 'message') {
                    this.notifications.push(`New message: ${data.text}`);
                    this.notification = {
                        message: `New message: ${data.text}`,
                        id: data.deal.dId
                    };
                }
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
            }
        },
        methods: {
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
            }
        },
        watch: {

        }
    }
</script>
<style>
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
        margin: 0 auto -60px;
        padding: 0 0 60px;
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

    .footer {
        background-color: #f5f5f5;
        border-top: 1px solid #ddd;
        padding-top: 20px;
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
</style>