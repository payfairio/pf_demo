<template>
    <div class="suggestions-list">
        <p>
            <router-link :to="{name: 'create-suggestion'}" class="btn btn-success">Create new suggestion</router-link>
        </p>

        <b-table striped hover
                 :items="getSuggestions"
                 :fields="fields"
                 :current-page="currentPage"
                 :per-page="perPage"
        >
            <template slot="s_name" slot-scope="row"><router-link :to="{name: 'suggestion', params: {id: row.item._id}}">{{row.item.name}}</router-link></template>
            <template slot="s_author" slot-scope="row">{{row.item.author.username}}</template>
            <template slot="s_created_at" slot-scope="row">{{row.item.created_at | date}}</template>

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
                    s_name: {label: 'Suggestion', sortable: true},
                    s_author: {label: 'Author', sortable: true},
                    s_created_at: {label: 'Created at', sortable: true}
                },
            }
        },
        methods: {
            // TODO: sort-changed, page-change, filter-change сделать методы
            getSuggestions: function (ctx) {
                console.log(ctx);
                const limit = ctx.perPage;
                const offset = (ctx.currentPage - 1) * ctx.perPage;
                const sortBy = ctx.sortBy;
                const order = ctx.sortDesc;
                let promise = this.$http.get(`/suggestions?limit=${limit}&offset=${offset}&sortBy=${sortBy}&order=${order}`);
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