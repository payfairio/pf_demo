<template>
    <div id="app">
        <div class="wrap">
            <b-navbar toggleable="md" type="dark" variant="info">
                <b-navbar-brand v-if="$auth.user().type === 'client'" :to="{name: 'deals'}">PayFair</b-navbar-brand>
                <b-navbar-brand v-if="$auth.user().type === 'trust'" :to="{name: 'suggestions'}">PayFair</b-navbar-brand>

                <b-nav-toggle target="nav_collapse"></b-nav-toggle>
                <b-collapse is-nav id="nav_collapse">
                    <b-nav is-nav-bar class="ml-auto">
                        <b-nav-item v-if="!$auth.check()" :to="{name: 'login'}">Login</b-nav-item>
                        <b-nav-item v-if="!$auth.check()" :to="{name: 'register'}">Register</b-nav-item>

                        <b-nav-item v-if="false && $auth.check()" v-on:click="showNotifications">{{notificationsCount}}</b-nav-item>

                        <b-nav-item-dropdown v-if="$auth.check()">
                            <template slot="button-content">
                               <span>Exchanges</span>
                            </template>
                            <b-dropdown-item :to="{name: 'my-exchanges'}">Your exchange ads</b-dropdown-item>
                            <b-dropdown-item :to="{name: 'exchanges'}">Buy/Sell coins</b-dropdown-item>
                        </b-nav-item-dropdown>

                        <b-nav-item v-if="$auth.check() && $auth.user().type === 'client'" :to="{name: 'deals'}">Deals</b-nav-item>

                        <b-nav-item v-if="$auth.check() && $auth.user().type === 'escrow'" :to="{name: 'disputes'}">Disputes</b-nav-item>

                        <b-nav-item v-if="$auth.check() && $auth.user().type === 'trust'" :to="{name: 'suggestions'}">Suggestions</b-nav-item>

                        <b-nav-item-dropdown v-if="$auth.check()" right>
                            <template slot="button-content">
                                <div class="nav-profile-card">
                                    <img :src="$auth.user().profileImg">
                                    <span>{{ $auth.user().username }}</span>
                                </div>
                            </template>
                            <b-dropdown-item :to="{name: 'profile'}">Profile</b-dropdown-item>
                            <b-dropdown-item>Wallet</b-dropdown-item>
                            <b-dropdown-item v-on:click="appLogout">Logout</b-dropdown-item>
                        </b-nav-item-dropdown>
                    </b-nav>

                </b-collapse>
            </b-navbar>
            <div class="container" id="app-content-container">
                <div v-if="$auth.ready() && (socketReady || !$auth.check())">
                    <router-view></router-view>
                </div>
                <div v-if="!$auth.ready() || (!socketReady && $auth.check())">
                    Loading ...
                </div>
            </div>
        </div>
        <footer class="footer">
            <div class="container">
                <p class="footer-links">
                    <a href="https://github.com/payfairio/pf_demo/issues" target="_blank">Issue tracker</a>
                </p>
            </div>
        </footer>
    </div>
</template>

<script>

    export default {
        name: 'app',
        data: function () {
            return {
                notifications: {
                    messages: {}
                },
                notificationsCount: 0,
                notificationsVisible: false,
                socketReady: false,
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
        border: 2px solid #ececec;
        background: #636b6f;
        width: 30px;
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
        height: 60px;
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
</style>