<template>
    <div class="deals-list">
        <p>
            <router-link :to="{name: 'create-deal'}" class="btn btn-success">Create new deal</router-link>
        </p>
        <b-table striped hover
                 :items="getDeals"
                 :fields="fields"
                 :current-page="currentPage"
                 :per-page="perPage"
        >
            <template slot="name" slot-scope="row"><router-link :to="{name: 'deal', params: {id: row.item.dId}}">{{row.value}}</router-link></template>
            <template slot="role" slot-scope="row">{{row.item.seller._id == $auth.user()._id ? 'seller' : 'buyer'}}</template>
            <template slot="counterparty" slot-scope="row">{{row.item.seller._id == $auth.user()._id ? row.item.buyer.email : row.item.seller.email}}</template>
            <template slot="created_at" slot-scope="row">{{row.value | date}}</template>

        </b-table>

        <b-pagination :total-rows="totalRows" :per-page="perPage" v-model="currentPage" />
    </div>
</template>
<script>
    export default {
        name: 'List',
        data: function () {
            return {
                perPage: 5,
                currentPage: 1,
                totalRows: 30,
                fields: {
                    name: {label: 'Deal name', sortable: true},
                    role: {label: 'Your role', sortable: true},
                    counterparty: {label: 'Counterparty', sortable: true},
                    created_at: {label: 'Created at', sortable: true},
                    //actions: {label: 'Actions'}
                },
            }
        },
        methods: {
            // TODO: sort-changed, page-change, filter-change сделать методы
            getDeals: function (ctx) {
                console.log(ctx);
                const limit = ctx.perPage;
                const offset = (ctx.currentPage - 1) * ctx.perPage;
                const sortBy = ctx.sortBy;
                const order = ctx.sortDesc;
                let promise = this.$http.get(`/deals?limit=${limit}&offset=${offset}&sortBy=${sortBy}&order=${order}`);
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