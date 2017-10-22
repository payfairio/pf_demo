<template>
    <div id="app">
        <b-navbar toggleable="md" type="dark" variant="info">
            <b-navbar-brand :to="{name: 'deals'}">PayFair</b-navbar-brand>
            <b-nav-toggle target="nav_collapse"></b-nav-toggle>
            <b-collapse is-nav id="nav_collapse">
                <b-nav is-nav-bar class="ml-auto">
                    <b-nav-item v-if="!$auth.check()" :to="{name: 'login'}">Login</b-nav-item>
                    <b-nav-item v-if="!$auth.check()" :to="{name: 'register'}">Register</b-nav-item>

                    <b-nav-item v-if="false && $auth.check()" v-on:click="showNotifications">{{notificationsCount}}</b-nav-item>
                    <b-nav-item v-if="$auth.check() && $auth.user().type === 'client'" :to="{name: 'deals'}">Deals</b-nav-item>

                    <b-nav-item v-if="$auth.check() && $auth.user().type === 'escrow'" :to="{name: 'disputes'}">Disputes</b-nav-item>

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
            <div v-if="$auth.ready()">
                <router-view></router-view>
            </div>
            <div v-if="!$auth.ready()">
                Loading ...
            </div>
        </div>
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
                notificationsVisible: false
            }
        },
        sockets: {
            connect: function() {
                this.$socket.emit('authenticate', {token: this.$auth.token() ? this.$auth.token().substr(4) : ''});
            },
            disconnect: function () {
                console.log('socket disconnected');
            },
            unauthorized: function () {
                console.log('socket unauthorized');
                this.$socket.disconnect();
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

</style>