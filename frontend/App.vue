<template>
    <div id="app">
        <b-navbar toggleable="md" type="dark" variant="info">
            <b-navbar-brand :to="{name: 'deals'}">PayFair</b-navbar-brand>
            <b-nav-toggle target="nav_collapse"></b-nav-toggle>
            <b-collapse is-nav id="nav_collapse">
                <b-nav is-nav-bar class="ml-auto">
                    <b-nav-item v-if="!$auth.check()" :to="{name: 'login'}">Login</b-nav-item>
                    <b-nav-item v-if="!$auth.check()" :to="{name: 'register'}">Register</b-nav-item>

                    <b-nav-item v-if="$auth.check()" :to="{name: 'deals'}">Deals</b-nav-item>
                    <b-nav-item-dropdown v-if="$auth.check()" right>
                        <template slot="button-content">
                            {{ $auth.user().username }}
                        </template>
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
            }
        }
    }
</script>
<style>

</style>