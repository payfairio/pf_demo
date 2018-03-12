<template>
    <div class="container-fluid" v-if="$auth.user().statusEscrowBool === true">
        <div class="deals-list">
            <b-table striped hover
                    :items="getDeals"
                    :fields="fields"
                     :sort-by.sync="sortBy"
                     :sort-desc.sync="sortDesc"
                    ref="deals"
            >
                <template slot="name" slot-scope="row"><router-link :to="{name: 'dispute', params: {id: row.item.dId}}">{{row.value}}</router-link></template>
                <template slot="decision" slot-scope="row">{{row.value}}</template>
                <template slot="called_at" slot-scope="row">{{new Date(row.value).toLocaleString()}}</template>
                <template slot="created_at" slot-scope="row">{{new Date(row.value).toLocaleString()}}</template>

            </b-table>
        </div>
    </div>
</template>
<script>
    export default {
        name: 'List',
        data: function () {
            return {

                sortBy: 'created_at',
                sortDesc: true,

                fields: {
                    name: {label: 'Deal name', sortable: true},
                    decision: {label: 'Your decision', sortable: true},
                    called_at: {label: 'You was called at', sortable: true},
                    created_at: {label: 'Created at', sortable: true},
                    //actions: {label: 'Actions'}
                },
            }
        },
        sockets: {
            notification: function (data) {
                this.$refs.deals.refresh();
            }
        },
        methods: {
            // TODO: sort-changed, page-change, filter-change сделать методы

            getDeals: function (ctx) {
                const sortBy = ctx.sortBy;
                const order = ctx.sortDesc;

                let promise = this.$http.get(`/deals/dispute?sortBy=${sortBy}&order=${order}`);
                return promise.then(function (response) {
                    return(response.data || []);
                }, function (err) {
                    return [];
                });
            }
        },
        watch: {

        },
    }
</script>
<style>

</style>