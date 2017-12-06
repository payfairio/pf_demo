<template>
    <div class="suggestions-list">
        <p>
            <router-link :to="{name: 'create-suggestion'}" class="btn btn-success">Create new suggestion</router-link>
        </p>
        <b-card no-body>
            <b-tabs card v-model="active_tab">
                <b-tab title="Active" active>
                    <b-table striped hover
                            :items="getSuggestions"
                            :fields="fields"
                            :current-page="currentPageActive"
                            :per-page="perPage"
                            sort-by="created_at"
                            :sort-desc="true"
                            v-if="active_tab == 0"
                    >
                        <template slot="name" slot-scope="row"><router-link :to="{name: 'suggestion', params: {id: row.item._id}}">{{row.item.name}}</router-link></template>
                        <template slot="author" slot-scope="row">{{row.item.author.username}}</template>
                        <template slot="created_at" slot-scope="row">{{row.item.created_at | date}}</template>
                        <template slot="votes" slot-scope="row">{{row.item.like.length}} | {{row.item.dislike.length}}</template>

                    </b-table>

                    <b-pagination :total-rows="totalRowsActive" :per-page="perPage" v-model="currentPageActive" />
                </b-tab>
                <b-tab title="In Process">
                    <b-table striped hover
                            :items="getSuggestions"
                            :fields="fields"
                            :current-page="currentPageInProcess"
                            :per-page="perPage"
                            sort-by="created_at"
                            :sort-desc="true"
                            v-if="active_tab == 1"
                    >
                        <template slot="name" slot-scope="row"><router-link :to="{name: 'suggestion', params: {id: row.item._id}}">{{row.item.name}}</router-link></template>
                        <template slot="author" slot-scope="row">{{row.item.author.username}}</template>
                        <template slot="created_at" slot-scope="row">{{row.item.created_at | date}}</template>
                        <template slot="votes" slot-scope="row">{{row.item.like.length}} | {{row.item.dislike.length}}</template>

                    </b-table>

                    <b-pagination :total-rows="totalRowsInProcess" :per-page="perPage" v-model="currentPageInProcess" />
                </b-tab>
                <b-tab title="Approved">
                    <b-table striped hover
                            :items="getSuggestions"
                            :fields="fields"
                            :current-page="currentPageApproved"
                            :per-page="perPage"
                            sort-by="created_at"
                            :sort-desc="true"
                            v-if="active_tab == 2"
                    >
                        <template slot="name" slot-scope="row"><router-link :to="{name: 'suggestion', params: {id: row.item._id}}">{{row.item.name}}</router-link></template>
                        <template slot="author" slot-scope="row">{{row.item.author.username}}</template>
                        <template slot="created_at" slot-scope="row">{{row.item.created_at | date}}</template>
                        <template slot="votes" slot-scope="row">{{row.item.like.length}} | {{row.item.dislike.length}}</template>

                    </b-table>

                    <b-pagination :total-rows="totalRowsApproved" :per-page="perPage" v-model="currentPageApproved" />
                </b-tab>
                <b-tab title="Disapproved">
                    <b-table striped hover
                            :items="getSuggestions"
                            :fields="fields"
                            :current-page="currentPageDisapproved"
                            :per-page="perPage"
                            sort-by="created_at"
                            v-if="active_tab == 3"
                    >
                        <template slot="name" slot-scope="row"><router-link :to="{name: 'suggestion', params: {id: row.item._id}}">{{row.item.name}}</router-link></template>
                        <template slot="author" slot-scope="row">{{row.item.author.username}}</template>
                        <template slot="created_at" slot-scope="row">{{row.item.created_at | date}}</template>
                        <template slot="votes" slot-scope="row">{{row.item.like.length}} | {{row.item.dislike.length}}</template>

                    </b-table>

                    <b-pagination :total-rows="totalRowsDisapproved" :per-page="perPage" v-model="currentPageDisapproved" />
                </b-tab>

                <b-tab title="My Suggestions" button-id="my-sug">
                    <b-table striped hover
                            :items="getSuggestions"
                            :fields="fields"
                            :current-page="currentPageMy"
                            :per-page="perPage"
                            sort-by="created_at"
                            :sort-desc="true"
                            v-if="active_tab == 4"
                    >
                        <template slot="name" slot-scope="row"><router-link :to="{name: 'suggestion', params: {id: row.item._id}}">{{row.item.name}}</router-link></template>
                        <template slot="author" slot-scope="row">{{row.item.author.username}}</template>
                        <template slot="created_at" slot-scope="row">{{row.item.created_at | date}}</template>
                        <template slot="votes" slot-scope="row">{{row.item.like.length}} | {{row.item.dislike.length}}</template>
                        <template slot="status" slot-scope="row">{{row.item.status}}</template>

                    </b-table>

                    <b-pagination :total-rows="totalRowsMy" :per-page="perPage" v-model="currentPageMy" />
                </b-tab>
            </b-tabs>
        </b-card>
    </div>
</template>
<script>
    export default {
        name: 'List',
        data: function () {
            return {
                active_tab: 0,
                perPage: 5,
                currentPageActive: 1,
                currentPageInProcess: 1,
                currentPageApproved: 1,
                currentPageDisapproved: 1,
                currentPageMy: 1,

                totalRowsMy: 0,
                totalRowsActive: 0,
                totalRowsInProcess: 0,
                totalRowsApproved: 0,
                totalRowsDisapproved: 0,
                fields: {
                    name: {label: 'Suggestion', sortable: true},
                    author: {label: 'Author', sortable: true},
                    created_at: {label: 'Created at', sortable: true},
                    votes: {label: 'Votes'},
                    status: {label: 'Status'}
                },
            }
        },

        created: function () {
            const limit = Number.MAX_SAFE_INTEGER;
            this.$http.get(`/suggestions?limit=${limit}&offset=0&sortBy=created_at&order=false&status=0`)
                .then(response => {
                    this.totalRowsActive = response.data.length;
                });
            this.$http.get(`/suggestions?limit=${limit}&offset=0&sortBy=created_at&order=false&status=1`)
                .then(response => {
                    this.totalRowsInProcess = response.data.length;
                });
            this.$http.get(`/suggestions?limit=${limit}&offset=0&sortBy=created_at&order=false&status=2`)
                .then(response => {
                    this.totalRowsApproved = response.data.length;
                });
            this.$http.get(`/suggestions?limit=${limit}&offset=0&sortBy=created_at&order=false&status=3`)
                .then(response => {
                    this.totalRowsDisapproved = response.data.length;
                });
            this.$http.get(`/suggestions?limit=${limit}&offset=0&sortBy=created_at&order=false&status=4`)
                .then(response => {
                    this.totalRowsMy = response.data.length;
                });
        },

        methods: {
            getSuggestions: function (ctx) {
                const limit = ctx.perPage;
                const offset = (ctx.currentPage - 1) * ctx.perPage;
                const sortBy = ctx.sortBy;
                const order = ctx.sortDesc;
                const status = this.active_tab;

                let _this = this;
                let promise = this.$http.get(`/suggestions?limit=${limit}&offset=${offset}&sortBy=${sortBy}&order=${order}&status=${status}`);
                return promise.then(function (response) {
                    _this.totalRows = response.data.length;
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
    #my-sug{
        position: absolute;
        right: 10px;
    }
</style>