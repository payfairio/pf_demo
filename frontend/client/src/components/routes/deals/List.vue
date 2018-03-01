<template>
    <div class="deals-list">
        <div class="container-fluid">
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
                            <template slot="messages" slot-scope="row">
                                {{row.item.last_message.text
                                ? (row.item.last_message.type == 'system'
                                ? 'System'
                                : (row.item.last_message.sender == $auth.user().username
                                ? 'You' : row.item.last_message.sender)) + ': ' + (
                                row.item.last_message.text.length > 25
                                ? row.item.last_message.text.substr(0, 25) + '...'
                                : row.item.last_message.text
                                )
                                : 'No messages'}}
                                <span class="new_messages" v-if="row.item.new_messages">{{row.item.new_messages}}</span>
                            </template>

                        </b-table>

                        <b-pagination :total-rows="totalRowsActive" :per-page="perPage" v-model="currentPageActive"></b-pagination>
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

                        <b-pagination :total-rows="totalRowsCompleted" :per-page="perPage" v-model="currentPageCompleted"></b-pagination>
                    </b-tab>
                    <b-tab title="Canceled">
                        <b-table striped hover
                                 :items="getDeals"
                                 :fields="fieldsCanceled"
                                 :current-page="currentPageCanceled"
                                 :per-page="perPage"
                                 sort-by="created_at"
                                 :sort-desc="true"
                                 v-if="active_tab == 2"
                        >
                            <template slot="name" slot-scope="row"><router-link :to="{name: 'deal', params: {id: row.item.dId}}">{{row.value}}</router-link></template>
                            <template slot="role" slot-scope="row">{{row.value}}</template>
                            <template slot="counterparty" slot-scope="row"><router-link :to="{name: 'user-by-id', params: {id: row.item.counterparty_id}}">{{row.value}}</router-link></template>
                            <template slot="created_at" slot-scope="row">{{row.value | date}}</template>
                            <template slot="coin" slot-scope="row" v-if="row.value">{{row.value.toUpperCase()}}</template>

                        </b-table>

                        <b-pagination :total-rows="totalRowsCanceled" :per-page="perPage" v-model="currentPageCanceled"></b-pagination>
                    </b-tab>
                </b-tabs>
            </b-card>
        </div>
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
                currentPageCanceled: 1,

                totalRowsActive: 0,
                totalRowsCompleted: 0,
                totalRowsCanceled: 0,
                fields: {
                    name: {label: 'Deal name', sortable: true},
                    role: {label: 'Your role', sortable: true},
                    counterparty: {label: 'Counterparty', sortable: true},
                    created_at: {label: 'Created at', sortable: true},
                    status: {label: 'Status'},
                    coin: {label: 'Currency'},
                    messages: {label: 'Last message', sortable: true}
                },
                fieldsCompleted: {
                    name: {label: 'Deal name', sortable: true},
                    role: {label: 'Your role', sortable: true},
                    counterparty: {label: 'Counterparty', sortable: true},
                    created_at: {label: 'Created at', sortable: true},
                    coin: {label: 'Currency'}
                },
                fieldsCanceled: {
                    name: {label: 'Deal name', sortable: true},
                    role: {label: 'Your role', sortable: true},
                    counterparty: {label: 'Counterparty', sortable: true},
                    created_at: {label: 'Created at', sortable: true},
                    coin: {label: 'Currency'},
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
                return promise.then(response => {
                    if (status == 0) {
                        vm.totalRowsActive = response.data.total;
                    }
                    if (status == 1) {
                        vm.totalRowsCompleted = response.data.total;
                    }
                    if (status == 2) {
                        vm.totalRowsCanceled = response.data.total;
                    }
                    return(response.data.data || []);
                }, err => {
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
<style scoped>
    .new_messages {
        background-color: #47e2ce;
        width: 17px;
        height: 17px;
        text-align: center;
        border-radius: 10px;
        font-size: 10px;
        color: #fff;
        display: inline-block;
    }
</style>