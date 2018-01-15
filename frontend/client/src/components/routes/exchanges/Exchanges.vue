<template>
    <div class="exchanges-list">
        <div v-if="!$auth.check()" class="welcome">
            <b-row align-h="center">
                <b-col sm="12">
                    <div class="wel-inner text-center">
                        <h3>PayFair</h3>
                        <p>Decentralised Escrow and P2P Crypto-exchange on the Ethereum blockchain</p>
                        <router-link :to="{name: 'register'}" class="btn btn-success">Join Now!</router-link>
                    </div>
                </b-col>
            </b-row>
        </div>
        <b-card no-body>
            <b-card-header>
                <div class="choose-coins">
                    <ul>
                        <li v-for="coin in coins"><router-link :to="{name: 'exchanges', query: {coin: coin, tradeType: tradeType, currency: currency}}" :class="!$route.query.coin && coin === 'PFR' ? 'router-link-exact-active' : ''">{{coin}}</router-link></li>
                    </ul>
                </div>
                <b-row class="choose-trade-params">
                    <b-col md="8" class="choose-trade-type">
                        <ul>
                            <li><router-link :to="{name: 'exchanges', query: {coin: coin, tradeType: 'sell', currency: currency}}" :class="!$route.query.tradeType ? 'router-link-exact-active' : ''">Sell {{coin.toUpperCase()}}</router-link></li>
                            <li><router-link :to="{name: 'exchanges', query: {coin: coin, tradeType: 'buy', currency: currency}}">Buy {{coin.toUpperCase()}}</router-link></li>
                        </ul>
                    </b-col>
                    <b-col md="2">
                        <b-select @input="selectCurrency" :options="currencies" :value="currency"></b-select>
                    </b-col>
                    <b-col md="2">
                        <b-select :options="paymentVariants" v-model="paymentType"></b-select>
                    </b-col>
                </b-row>
            </b-card-header>
            <b-card-body>
                <div class="table-responsive">
                    <b-table striped hover class="centered-rows-table"
                             :items="getExchanges"
                             :fields="fields"
                             :current-page="currentPage"
                             :per-page="perPage"
                             sort-by="rate"
                             :sort-desc="true"
                             ref="tradesTable"
                             :show-empty="true"
                    >
                        <template slot="owner" slot-scope="row">{{$auth.user().username == row.value.username ? "You" : (row.value.username + '[' + (row.value.online && row.value.online.status ? 'online' : 'offline') + ']')}}</template>
                        <!-- <template slot="tradeType" slot-scope="row">{{row.value}}</template> -->
                        <template slot="coin" slot-scope="row">{{row.value}}</template>
                        <template slot="paymentType" slot-scope="row">{{row.value}}{{row.item.paymentTypeDetail ? ': ' + row.item.paymentTypeDetail : '' }}</template>
                        <template slot="rate" slot-scope="row">{{row.value}} {{row.item.currency}} / {{row.item.coin}}</template>
                        <template slot="created_at" slot-scope="row">{{row.value | date}}</template>
                        <template slot="actions" slot-scope="row"><router-link :to="{name: 'exchange', params: {id: row.item.eId}}" class="btn btn-primary">{{tradeType}} coins</router-link></template>
                    </b-table>
                </div>
                <b-pagination :total-rows="totalRows" :per-page="perPage" v-model="currentPage"></b-pagination>
            </b-card-body>
        </b-card>
    </div>
</template>
<script>
    export default {
        name: 'ExchangesList',
        created: function () {
            const vm = this;
            vm.$http.get('/coins').then(response => {
                vm.coins = response.data;
            }).catch(err => {
                console.log(err);
            })
        },
        data: () => {
            return {
                coins: [],
                active_tab: 0,
                currentPage: 1,
                perPage: 20,
                totalRows: 0,
                currencies: ['USD', 'RUB'],
                paymentType: null,
                paymentVariants: [
                    {
                        text: 'All payment methods',
                        value: null
                    },
                    {
                        text: 'Transfers with specific bank',
                        value: 'Transfers with specific bank',
                    },
                    {
                        text: 'Cash deposit',
                        value: 'Cash deposit',
                    }
                ],
                fields: {
                    //eId: {label: 'Exhange', sortable: false},
                    owner: {label: 'Owner', sortable: true},
                    // tradeType: {label: 'Trade Type', sortable: true},
                    coin: {label: 'Coin', sortable: true},
                    paymentType: {label: 'Payment type', sortable: true},
                    rate: {label: 'Rate(fiat to coins)', sortable: true},
                    created_at: {label: 'Created at', sortable: true},
                    actions: {label: 'Actions'}
                }

            }
        },
        methods: {
            getExchanges: function (ctx) {
                const vm = this;
                const limit = ctx.perPage;
                const offset = (ctx.currentPage - 1) * ctx.perPage;
                const sortBy = ctx.sortBy;
                const order = ctx.sortDesc;
                const type = vm.tradeType;

                return this.$http.get(`/exchanges/list?limit=${limit}&offset=${offset}&sortBy=${sortBy}&order=${order}&type=${type}&coin=${vm.coin}&currency=${vm.currency}`+(vm.paymentType ? '&payment='+vm.paymentType : ''))
                    .then(function (response) {
                        vm.totalRows = response.data.total;
                        return (response.data.data || []);
                    })
                    .catch(err => []);
            },
            selectCurrency: function (val) {
                this.$router.push({name: 'exchanges', query: {coin: this.coin, tradeType: this.tradeType, currency: val}});
            },
        },
        filters: {
            date: function (value) {
                return (new Date(value)).toLocaleString();
            }
        },
        computed: {
            'coin': function () {
                if (this.$route.query.coin) {
                    return this.$route.query.coin.toUpperCase();
                }
                return 'PFR';
            },
            'tradeType': function () {
                if (this.$route.query.tradeType) {
                    return this.$route.query.tradeType.toLowerCase();
                }
                return 'sell';
            },
            'currency': function () {
                if (this.$route.query.currency) {
                    return this.$route.query.currency.toUpperCase();
                }
                return 'USD';
            },
        },
        watch: {
            '$route.query': function () {
                this.paymentType = null;
                this.$refs.tradesTable.refresh();
            },
            'paymentType': function () {
                this.$refs.tradesTable.refresh();
            }
        }
    }
</script>
<style scoped>
    .welcome {
        margin-bottom: 40px;
    }
    .wel-inner {
        background: #fff;
        padding: 20px;
        border: 1px solid #dedede;
        border-radius: 4px;
    }
    .wel-inner > h3 {
        font-size: 2.5rem;
        margin-bottom: 20px;
    }
    .choose-coins {
        border-bottom: 1px solid rgba(0, 0, 0, 0.125);
        margin-bottom: 15px;
    }
    .choose-coins ul {
        list-style: none;
        margin: 0;
        padding: 0;
        flex-wrap: wrap;
        display: flex;
    }
    .choose-coins ul li {
        align-items: center;
        display: flex;
        margin-right: 12px;
        margin-bottom: 12px;
    }
    .choose-coins ul li a {
        font-weight: bold;
        color: #495057;
        padding: 0.5rem 1rem;
        border-radius: 0.25rem;
        text-decoration: none;
        border-color: #e1e1e1;
        border-bottom: 2px solid #e1e1e1;
        border-left: 2px solid #e1e1e1;
        border-top: 2px solid #e1e1e1;
        border-right: 2px solid #e1e1e1;
    }
    .choose-coins ul li a:hover, .choose-coins ul li a.router-link-exact-active {
        background-color: #fff;
        color: #308f70;
        border-color: #49e1cd;
        border-bottom: 2px solid #49e1cd;
        border-left: 2px solid #49e1cd;
        border-top: 2px solid #49e1cd;
        border-right: 2px solid #49e1cd;
    }

    .exchanges-list .card-header {
        padding-bottom: 0;
    }

    .choose-trade-type ul {
        list-style: none;
        margin: 1.25rem 0 0;
        padding: 0;
        flex-wrap: wrap;
        display: flex;
    }
    .choose-trade-type ul li {
        align-items: center;
        display: flex;
        margin-right: 12px;
    }

    .choose-trade-type ul li a {
        font-weight: bold;
        color: #495057;
        padding: 0.5rem 1rem;
        border-radius: 0.25rem 0.25rem 0 0;
        text-decoration: none;
        border-color: #e1e1e1;
        border-bottom: 2px solid transparent;
        border-left: 1px solid #e1e1e1;
        border-top: 1px solid #e1e1e1;
        border-right: 1px solid #e1e1e1;
    }
    .choose-trade-type ul li a:hover, .choose-trade-type ul li a.router-link-exact-active {
        background-color: #fff;
        color: #308f70;
        border-color: #49e1cd;
        border-bottom: 2px solid #49e1cd;
        border-left: 1px solid #e1e1e1;
        border-top: 1px solid #e1e1e1;
        border-right: 1px solid #e1e1e1;
    }
</style>