<template>
    <div class="exchanges-list">
        <div class="container-fluid">
            <p>
                <router-link :to="{name: 'create-exchange'}" class="btn btn-success">Post a new trade</router-link>
            </p>
            <b-table striped hover
                     :items="getExchanges"
                     :fields="fields"
                     :current-page="currentPage"
                     :per-page="perPage"
                     sort-by="created_at"
                     :sort-desc="true"
            >
                <template slot="eId" slot-scope="row"><router-link :to="{name: 'manage-exchange', params: {id: row.item.eId}}">Exchange #{{row.value}}</router-link></template>
                <template slot="tradeType" slot-scope="row">{{row.value}}</template>
                <template slot="coin" slot-scope="row">{{row.value}}</template>
                <template slot="paymentType" slot-scope="row">{{row.value}}</template>
                <template slot="rate" slot-scope="row">{{row.value}}</template>
                <template slot="created_at" slot-scope="row">{{row.value | date}}</template>
                <template slot="status" slot-scope="row">{{row.value}}</template>
            </b-table>

            <b-pagination :total-rows="totalRows" :per-page="perPage" v-model="currentPage" />
        </div>
    </div>
</template>
<script>
    export default {
        name: 'ExchangesList',
        data: function () {
            return {
                currentPage: 1,
                perPage: 20,
                totalRows: 0,
                fields: {
                    eId: {label: 'Exhange', sortable: false},
                    tradeType: {label: 'Trade Type', sortable: true},
                    coin: {label: 'Coin', sortable: true},
                    paymentType: {label: 'Payment type', sortable: true},
                    rate: {label: 'Rate(fiat to coins)', sortable: true},
                    created_at: {label: 'Created at', sortable: true},
                    status: {label: 'Status', sortable: true},
                    //actions: {label: 'Actions'}
                },
            }
        },

        methods: {
            getExchanges: function (ctx) {
                const limit = ctx.perPage;
                const offset = (ctx.currentPage - 1) * ctx.perPage;
                const sortBy = ctx.sortBy;
                const order = ctx.sortDesc;
                let promise = this.$http.get(`/exchanges?limit=${limit}&offset=${offset}&sortBy=${sortBy}&order=${order}`);
                return promise.then(response => {
                    this.totalRows = response.data.total;
                    return (response.data.data || []);
                }).catch(error => {
                    return [];
                });
            },
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

</style>