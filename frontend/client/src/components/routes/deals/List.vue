<template>
    <div class="deals-list">
        <p>
            <router-link :to="{name: 'create-deal'}" class="btn btn-success">Create new deal</router-link>
        </p>

        <b-card no-body>
            <b-tabs card v-model="active_tab">
                <b-tab title="Active" active>
                    <b-table striped hover
                            :items="getDeals"
                            :fields="fields"
                            :current-page="currentPageActive"
                            :per-page="perPage"
                            sort-by="created_at"
                            :sort-desc="true"
                            v-if="active_tab == 0"
                            ref="deals"
                    >
                        <template slot="name" slot-scope="row"><router-link :to="{name: 'deal', params: {id: row.item.dId}}">{{row.value}}</router-link></template>
                        <template slot="role" slot-scope="row">{{row.value}}</template>
                        <template slot="counterparty" slot-scope="row"><router-link :to="{name: 'user-by-id', params: {id: row.item.counterparty_id}}">{{row.value}}</router-link></template>
                        <template slot="created_at" slot-scope="row">{{row.value | date}}</template>
                        <template slot="status" slot-scope="row">{{row.value}}</template>
                        <template slot="coin" slot-scope="row" v-if="row.value">{{row.value.toUpperCase()}}</template>

                    </b-table>

                    <b-pagination :total-rows="totalRowsActive" :per-page="perPage" v-model="currentPageActive" />
                </b-tab>
                <b-tab title="Completed">
                    <b-table striped hover
                            :items="getDeals"
                            :fields="fieldsCompleted"
                            :current-page="currentPageCompleted"
                            :per-page="perPage"
                            sort-by="created_at"
                            :sort-desc="true"
                            v-if="active_tab == 1"
                    >
                        <template slot="name" slot-scope="row"><router-link :to="{name: 'deal', params: {id: row.item.dId}}">{{row.value}}</router-link></template>
                        <template slot="role" slot-scope="row">{{row.value}}</template>
                        <template slot="counterparty" slot-scope="row"><router-link :to="{name: 'user-by-id', params: {id: row.item.counterparty_id}}">{{row.value}}</router-link></template>
                        <template slot="created_at" slot-scope="row">{{row.value | date}}</template>
                        <template slot="coin" slot-scope="row" v-if="row.value">{{row.value.toUpperCase()}}</template>

                    </b-table>

                    <b-pagination :total-rows="totalRowsCompleted" :per-page="perPage" v-model="currentPageCompleted" />
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
                perPage: 20,
                currentPageActive: 1,
                currentPageCompleted: 1,

                totalRowsActive: 0,
                totalRowsCompleted: 0,
                fields: {
                    name: {label: 'Deal name', sortable: true},
                    role: {label: 'Your role', sortable: true},
                    counterparty: {label: 'Counterparty', sortable: true},
                    created_at: {label: 'Created at', sortable: true},
                    status: {label: 'Status'},
                    coin: {label: 'Currency'}
                },
                fieldsCompleted: {
                    name: {label: 'Deal name', sortable: true},
                    role: {label: 'Your role', sortable: true},
                    counterparty: {label: 'Counterparty', sortable: true},
                    created_at: {label: 'Created at', sortable: true},
                    coin: {label: 'Currency'}
                },
                active_tab: 0
            }
        },
        sockets: {
            notification: function (data) {
                this.$refs.deals.refresh();
            }
        },

        methods: {
            getDeals: function (ctx) {
                const vm = this;
                const limit = ctx.perPage;
                const offset = (ctx.currentPage - 1) * ctx.perPage;
                const sortBy = ctx.sortBy;
                const order = ctx.sortDesc;

                const status = this.active_tab;

                let promise = this.$http.get(`/deals?limit=${limit}&offset=${offset}&sortBy=${sortBy}&order=${order}&status=${status}`);
                return promise.then(function (response) {
                    if (status == 0) {
                        vm.totalRowsActive = response.data.total;
                    }
                    if (status == 1) {
                        vm.totalRowsCompleted = response.data.total;
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

</style>