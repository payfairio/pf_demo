<template>
    <div class="deals-list">
        <p>
            <router-link :to="{name: 'create-deal'}" class="btn btn-success">Create new deal</router-link>
        </p>
        <b-table striped hover
                 :items="getDeals"
                 :fields="fields"
        >
            <template slot="name" scope="row"><router-link :to="{name: 'deal', params: {id: row.item.dId}}">{{row.value}}</router-link></template>
            <template slot="role" scope="row">{{row.item.seller._id == $auth.user()._id ? 'seller' : 'buyer'}}</template>
            <template slot="counterparty" scope="row">{{row.item.seller._id == $auth.user()._id ? row.item.buyer.email : row.item.seller.email}}</template>
            <template slot="created_at" scope="row">{{row.value}}</template>

        </b-table>
    </div>
</template>
<script>
    export default {
        name: 'List',
        data: function () {
            return {
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
                let promise = this.$http.get('/deals');
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