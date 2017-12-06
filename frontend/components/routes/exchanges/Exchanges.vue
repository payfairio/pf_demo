<template>
    <div class="exchanges-list">
        <p>search</p>
        <b-table striped hover
                 :items="getExchanges"
                 :fields="fields"
                 :current-page="currentPage"
                 :per-page="perPage"
                 sort-by="created_at"
                 :sort-desc="true"
        >
            <template slot="tradeType" slot-scope="row">{{row.value}}</template>
            <template slot="coin" slot-scope="row">{{row.value}}</template>
            <template slot="paymentType" slot-scope="row">{{row.value}}</template>
            <template slot="rate" slot-scope="row">{{row.value}}</template>
            <template slot="created_at" slot-scope="row">{{row.value | date}}</template>

        </b-table>

        <b-pagination :total-rows="totalRows" :per-page="perPage" v-model="currentPage" />
    </div>
</template>
<script>
    export default {
        name: 'ExchangesList',
        data: function () {
            return {
                currentPage: 1,
                perPage: 5,
                totalRows: 0,
                fields: {
                    //eId: {label: 'Exhange', sortable: false},
                    tradeType: {label: 'Trade Type', sortable: true},
                    coin: {label: 'Coin', sortable: true},
                    paymentType: {label: 'Payment type', sortable: true},
                    rate: {label: 'Rate(fiat to coins)', sortable: true},
                    created_at: {label: 'Created at', sortable: true},
                    //actions: {label: 'Actions'}
                },
            }
        },

        created: function() {
            const limit = Number.MAX_SAFE_INTEGER;
            this.$http.get(`/exchanges/list?limit=${limit}&offset=0&sortBy=created_at&order=false`)
                .then(response => {
                    this.totalRows = response.data.length;
                });
        },

        methods: {
            // TODO: sort-changed, page-change, filter-change сделать методы
            getExchanges: function (ctx) {
                const limit = ctx.perPage;
                const offset = (ctx.currentPage - 1) * ctx.perPage;
                const sortBy = ctx.sortBy;
                const order = ctx.sortDesc;
                let promise = this.$http.get(`/exchanges/list?limit=${limit}&offset=${offset}&sortBy=${sortBy}&order=${order}`);
                return promise.then(function (response) {
                    return(response.data || []);
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

</style>