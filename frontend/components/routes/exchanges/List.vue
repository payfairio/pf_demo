<template>
    <div class="exchanges-list">
        <p>
            <router-link :to="{name: 'create-exchange'}" class="btn btn-success">Post a new trade</router-link>
        </p>
        <b-table striped hover
                 :items="getExchanges"
                 :fields="fields"
        >
            <template slot="eId" slot-scope="row"><router-link :to="{name: 'manage-exchange', params: {id: row.item.eId}}">Exchange #{{row.value}}</router-link></template>
            <template slot="tradeType" slot-scope="row">{{row.value}}</template>
            <template slot="coin" slot-scope="row">{{row.value}}</template>
            <template slot="paymentType" slot-scope="row">{{row.value}}</template>
            <template slot="rate" slot-scope="row">{{row.value}}</template>
            <template slot="created_at" slot-scope="row">{{row.value}}</template>

        </b-table>
    </div>
</template>
<script>
    export default {
        name: 'ExchangesList',
        data: function () {
            return {
                fields: {
                    eId: {label: 'Exhange', sortable: false},
                    tradeType: {label: 'Trade Type', sortable: true},
                    coin: {label: 'Coin', sortable: true},
                    paymentType: {label: 'Payment type', sortable: true},
                    rate: {label: 'Rate(fiat to coins)', sortable: true},
                    created_at: {label: 'Created at', sortable: true},
                    //actions: {label: 'Actions'}
                },
            }
        },
        methods: {
            // TODO: sort-changed, page-change, filter-change сделать методы
            getExchanges: function (ctx) {
                let promise = this.$http.get('/exchanges');
                return promise.then(function (response) {
                    return(response.data || []);
                }, function (err) {
                    return [];
                });
            }
        },
        watch: {

        }
    }
</script>
<style>

</style>