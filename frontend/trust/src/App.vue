<template>
    <div id="app">
        <div class="wrap">
            <div class="demo-topbar">This is just a demo on the ropsten testnet. Please do not use this app for real trades. <a href="https://ropsten.etherscan.io">etherscan for ropsten</a> </div>
            <b-navbar toggleable="md" type="dark" variant="gray">
                <b-navbar-brand :to="'/'"><img :src="$config.staticUrl+'/images/pfr_logo.svg'" alt="PayFair"></b-navbar-brand>

                <b-nav-toggle target="nav_collapse"></b-nav-toggle>
                <b-collapse is-nav id="nav_collapse">
                    <b-nav-item v-if="$auth.check()" :to="{name: 'dashboard', path: '/dashboard'}">Trust Node Dashboard</b-nav-item>
                    <b-nav-item v-if="$auth.check()" :to="{name: 'suggestions', path: '/suggestions'}">Suggestions</b-nav-item>
                    <b-nav-item v-if="$auth.check()" :to="{name: 'stats', path: '/stats'}">Platform Stats</b-nav-item>
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
                                    </span>
                                </div>
                                <div v-for="(value, name) in getBalances()" class="currency">
                                    <span>{{name}}</span>
                                    <span class="right">
                                        <span class="total">{{value.total}}</span>
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
            <div>
                <div v-if="$auth.ready() && (socketReady || !$auth.check())">
                     <b-alert variant="info"
                        dismissible
                        :show="showNotification"
                        @dismissed="showNotification=false">
                        <router-link :to="{name: 'deal', params: {id: notification.id}}"><span @click="showNotification=false">{{notification.message}}</span></router-link>
                    </b-alert>

                    <div class="container" v-if="$auth.user().status == 'unverified'">
                        <div class="welcome">
                            <b-row align-h="center">
                                <b-col sm="12">
                                    <div class="wel-inner text-center">
                                        <h3>Hello, {{$auth.user().username}}</h3>
                                        <p>Your wallet doesn't have enough coins. Add a new wallet or top up the balance on your current one.</p>

                                        <p style="font-weight: bolder">Go to the website <a href="https://www.myetherwallet.com/signmsg.html">https://www.myetherwallet.com/signmsg.html</a><br>
                                            Unlock your wallet under "How would you like to access your wallet" <br>
                                            Enter your PayFair <a style="color: red">USERNAME</a> in the Message window and click "Sign Message" <br>
                                            Copy the "Signature" textbox field and paste it into the "Signature" field below<br>
                                            Click "Check and add new wallet"<br>
                                            If the wallet is signed correctly and it contains enough PFR (10,000 PFR minimum), it will be connected your profile</p>
                                        <a style="color: red; font-weight: bolder">Use Ropsten accounts</a>

                                        <b-form @submit="addConfirmWallet">
                                            <b-form-group id="sigInputGroup" label="Signature" label-for="Signature">
                                                <b-form-textarea placeholder="Paste your NEW signature here" id="sig" :rows="8" v-model="textArea_form.text"></b-form-textarea>
                                            </b-form-group>

                                            <b-button type="submit" variant="primary">
                                                Check and add new wallet
                                            </b-button>
                                        </b-form>
                                    </div>
                                </b-col>
                            </b-row>
                        </div>
                    </div>

                    <router-view></router-view>
                </div>
                <div v-if="!$auth.ready() || (!socketReady && $auth.check())">
                    Loading ...
                </div>
            </div>
        </div>
        <footer class="footer">
            <div class="container">
                <div class="footer-dashboard-links">
                    <ul>
                        <li><a target="_blank" href="https://payfair.io">Client-node dashboard</a></li>
                        <li><a target="_blank" href="https://escrow.payfair.io">Escrow-node dashboard</a></li>
                    </ul>
                </div>
            </div>
        </footer>

        <div class="loader-wrap" v-if="loading">
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

                textArea_form:{
                    text:''
                },

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
            //check wallet trust
            checkWallet: function () {
                const vm = this;
                if (this.$auth.check()){
                    this.$http.post('/wallet/checkWallet').then( function (res) {

                    }, function (err) {
                        if (vm.$auth.check()) {
                            vm.$swal('Warning', ' There is not enough money in your account to work with PF!', 'warning');
                        }
                    });
                }

            },

            //add confirm wallet trust
            addConfirmWallet: function (e) {
                e.preventDefault();
                const vm = this;
                let address = '';
                let sig = '';
                let signmsg = this.textArea_form.text.replace(/\s/g,'').replace(/{/g,'').replace(/}/g,'').replace(/"/g,'').replace(/'/g,'').split(',');

                for (let i in signmsg){
                    let currItem = signmsg[i].split(':');
                    if (currItem[0].toLowerCase() === 'address'){
                        address = currItem[1];
                    }
                    if (currItem[0].toLowerCase() === 'sig'){
                        sig = currItem[1];
                    }
                }

                this.$http.post('/wallet/addConfirmWallet', {address: address, sig: sig}).then( function (res) {
                    vm.$swal('Succes', 'Your Payfair Trust node has been activated', 'success');
                }, function (err) {
                    vm.$swal('Error', 'There was a problem verifying your wallet', 'error');
                    console.log(err);
                });
            },

            updateBalance: function(){
                const balances = this.$auth.user().balances;
                const holds = this.$auth.user().holds;
                for (var i in balances) {
                    this.balance[i].total = balances[i];
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
</style>