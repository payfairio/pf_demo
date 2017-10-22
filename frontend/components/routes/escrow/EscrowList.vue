<template>
    <div class="deals-list">
        <b-table striped hover
                 :items="getDeals"
                 :fields="fields"
        >
            <template slot="name" slot-scope="row"><router-link :to="{name: 'dispute', params: {id: row.item.dId}}">{{row.value}}</router-link></template>
            <template slot="decision" slot-scope="row">{{row.value}}</template>
            <template slot="called_at" slot-scope="row">{{row.value}}</template>
            <template slot="created_at" slot-scope="row">{{row.value}}</template>

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
                    decision: {label: 'Your decision', sortable: true},
                    called_at: {label: 'You was called at', sortable: true},
                    created_at: {label: 'Created at', sortable: true},
                    //actions: {label: 'Actions'}
                },
            }
        },
        methods: {
            // TODO: sort-changed, page-change, filter-change сделать методы
            getDeals: function (ctx) {
                let promise = this.$http.get('/deals/dispute');
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