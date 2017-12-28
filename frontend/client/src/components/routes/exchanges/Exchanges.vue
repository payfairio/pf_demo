<template>
    <div class="exchanges-list">
        <div v-if="!$auth.check()" class="welcome">
            <b-row align-h="center">
                <b-col sm="12">
                    <div class="wel-inner text-center">
                        <h3>PayFair</h3>
                        <p>Decentralised Escrow and P2P Crypto-exchange on the Ethereum blockchain</p>
                        <router-link :to="{name: 'register'}" class="btn btn-success">Join Now!</router-link>
                    </div>
                </b-col>
            </b-row>
        </div>
        <b-card no-body>
            <b-tabs card v-model="active_tab">
                <b-tab title="Sell coins" active>
                    <b-table striped hover class="centered-rows-table"
                            :items="getExchanges"
                            :fields="fields"
                            :current-page="currentPageBuy"
                            :per-page="perPage"
                            sort-by="rate"
                            :sort-desc="true"
                            v-if="active_tab == 0"
                    >
                        <template slot="owner" slot-scope="row">{{$auth.user().username == row.value.username ? "You" : (row.value.username + '[' + (row.value.online && row.value.online.status ? 'online' : 'offline') + ']')}}</template>
                        <!-- <template slot="tradeType" slot-scope="row">{{row.value}}</template> -->
                        <template slot="coin" slot-scope="row">{{row.value}}</template>
                        <template slot="paymentType" slot-scope="row">{{row.value}}{{row.item.paymentTypeDetail ? ': ' + row.item.paymentTypeDetail : '' }}</template>
                        <template slot="rate" slot-scope="row">{{row.value}} {{row.item.currency}}</template>
                        <template slot="created_at" slot-scope="row">{{row.value | date}}</template>
                        <template slot="actions" slot-scope="row"><router-link :to="{name: 'exchange', params: {id: row.item.eId}}" class="btn btn-primary">Sell coins</router-link></template>

                    </b-table>

                    <b-pagination :total-rows="totalRowsBuy" :per-page="perPage" v-model="currentPageBuy" />
                </b-tab>

                <b-tab title="Buy coins">
                    <b-table striped hover class="centered-rows-table"
                            :items="getExchanges"
                            :fields="fields"
                            :current-page="currentPageSell"
                            :per-page="perPage"
                            sort-by="rate"
                            :sort-desc="false"
                            v-if="active_tab == 1"
                    >
                        <template slot="owner" slot-scope="row">{{$auth.user().username == row.value.username ? "You" : (row.value.username + '[' + (row.value.online && row.value.online.status ? 'online' : 'offline') + ']')}}</template>
                        <!-- <template slot="tradeType" slot-scope="row">{{row.value}}</template> -->
                        <template slot="coin" slot-scope="row">{{row.value}}</template>
                        <template slot="paymentType" slot-scope="row">{{row.value}}{{row.item.paymentTypeDetail ? ': ' + row.item.paymentTypeDetail : '' }}</template>
                        <template slot="rate" slot-scope="row">{{row.value}} {{row.item.currency}}</template>
                        <template slot="created_at" slot-scope="row">{{row.value | date}}</template>
                        <template slot="actions" slot-scope="row"><router-link :to="{name: 'exchange', params: {id: row.item.eId}}" class="btn btn-primary">Buy coins</router-link></template>

                    </b-table>

                    <b-pagination :total-rows="totalRowsSell" :per-page="perPage" v-model="currentPageSell" />
                </b-tab>
            </b-tabs>
        </b-card>
    </div>
</template>
<script>
    export default {
        name: 'ExchangesList',
        data: function () {
            return {
                active_tab: 0,
                currentPageBuy: 1,
                currentPageSell: 1,
                perPage: 20,
                totalRowsBuy: 0,
                totalRowsSell: 0,
                fields: {
                    //eId: {label: 'Exhange', sortable: false},
                    owner: {label: 'Owner', sortable: true},
                    // tradeType: {label: 'Trade Type', sortable: true},
                    coin: {label: 'Coin', sortable: true},
                    paymentType: {label: 'Payment type', sortable: true},
                    rate: {label: 'Rate(fiat to coins)', sortable: true},
                    created_at: {label: 'Created at', sortable: true},
                    actions: {label: 'Actions'}
                },
            }
        },
        methods: {
            // TODO: sort-changed, page-change, filter-change сделать методы
            getExchanges: function (ctx) {
                const vm = this;
                const limit = ctx.perPage;
                const offset = (ctx.currentPage - 1) * ctx.perPage;
                const sortBy = ctx.sortBy;
                const order = ctx.sortDesc;
                const type = this.active_tab == 0 ? 'buy' : 'sell';

                let promise = this.$http.get(`/exchanges/list?limit=${limit}&offset=${offset}&sortBy=${sortBy}&order=${order}&type=${type}`);
                return promise.then(function (response) {
                    if (type === 'buy') {
                        vm.totalRowsBuy = response.data.total;
                    }
                    if (type === 'sell') {
                        vm.totalRowsSell = response.data.total;
                    }
                    return(response.data.data || []);
                }, function (err) {
                    return [];
                });
            }
        },
        filters: {
            date: function (value) {
                return (new Date(value)).toLocaleString();
            }
        },
        watch: {

        }
    }
</script>
<style>
    .welcome {
        margin-bottom: 40px;
    }
    .wel-inner {
        background: #fff;
        padding: 20px;
        border: 1px solid #dedede;
        border-radius: 4px;
    }
    .wel-inner > h3 {
        font-size: 2.5rem;
        margin-bottom: 20px;
    }
</style>