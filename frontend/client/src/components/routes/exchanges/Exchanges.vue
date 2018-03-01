<template>
    <div class="exchanges-list">
        <div class="container-fluid no-margin-top">
            <b-row align-h="center">
                <div v-if="!$auth.check()" class="welcome" id="wel-top">
                    <div class="container">
                        <b-row class="align-items-center">
                            <b-col sm="12" md="7" lg="7">
                                <h1 class="pf-raleway"><span>Pay</span>fair</h1>
                                <p>PAYFAIR is a decentralized Escrow platform and p2p exchange which ensures the paramount security of all cryptocurrency transactions made between two parties.<br>
                                We provide low fees for all transactions in a safe, private and decentralized environment.</p>
                                <router-link :to="{name: 'register'}" class="wel-btn btn-join">Join now!</router-link>
                                <router-link :to="{name: 'about'}" class="wel-btn btn-about">About us</router-link>
                            </b-col>
                            <b-col sm="12" md="5" lg="5">
                                <div class="play-video text-right" v-b-modal.vidModal>
                                    <img :src="$config.staticUrl+ '/images/welcome-play-hover.png'" class="wel-icon pl-hov">
                                    <img :src="$config.staticUrl+ '/images/welcome-play-icon.png'" class="wel-icon pl-icon">
                                    <img :src="$config.staticUrl+ '/images/welcome-video.png'" alt="Play">
                                </div>
                                <b-modal id="vidModal" hide-footer size="lg" ref="vidModal" @hide="pauseVid">
                                    <youtube :video-id="videoId" ref="youtube" width="100%"></youtube>
                                </b-modal>
                            </b-col>
                        </b-row>
                    </div>
                </div>
            </b-row>
        </div>
        <div class="container-fluid">
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
                                 sort-by="created_at"
                                 :sort-desc="true"
                                 ref="tradesTable"
                                 :show-empty="true"
                        >
                            <template slot="owner" slot-scope="row">{{$auth.user().username == row.value.username ? "You" : (row.value.username + '[' + (row.value.online && row.value.online.status ? 'online' : 'offline') + ']')}}</template>
                            <!-- <template slot="tradeType" slot-scope="row">{{row.value}}</template> -->
                            <template slot="coin" slot-scope="row">{{row.value}}</template>
                            <template slot="paymentType" slot-scope="row">{{row.value}}{{row.item.paymentTypeDetail ? ':' + $options.filters.truncate(row.item.paymentTypeDetail) : ''}}</template>
                            <template slot="rate" slot-scope="row">{{row.value}} {{row.item.currency}} / {{row.item.coin}}</template>
                            <template slot="limits" slot-scope="row">{{row.value && row.value.min ? row.value.min : ''}} - {{row.value && row.value.max ? row.value.max : '&infin;'}}</template>
                            <template slot="created_at" slot-scope="row">{{row.value | date}}</template>
                            <template slot="actions" slot-scope="row">
                                <router-link v-if="row.item.owner.username != $auth.user().username && row.item.status != 'closed'" :to="{name: 'exchange', params: {id: row.item.eId}}" class="btn btn-primary">{{tradeType}} coins</router-link>
                                <b-button disabled v-if="row.item.owner.username == $auth.user().username || row.item.status == 'closed'">{{tradeType}} coins</b-button>
                            </template>
                        </b-table>
                    </div>
                    <b-pagination :total-rows="totalRows" :per-page="perPage" v-model="currentPage"></b-pagination>
                </b-card-body>
            </b-card>
        </div>
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
                videoId: '82dv-QSRD-0',
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
                    limits: {label: 'Limits', sortable: false},
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
            pauseVid() {
                this.player.pauseVideo();
            }
        },
        filters: {
            date: function (value) {
                return (new Date(value)).toLocaleString();
            },
            truncate: function (text) {
                var clamp = '...';
                var textLength = 45;
                var node = document.createElement('div');
                node.innerHTML = text;
                var content = node.textContent;
                return content.length > textLength ? content.slice(0, textLength) + clamp : content;
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
            player () {
                return this.$refs.youtube.player;
            }
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
      box-shadow: 0 5px 15px -5px;
    }
    .welcome .pf-raleway{
        font-family: 'Raleway';
        text-transform: uppercase;
        font-size: 40px;
        color:#2b9285;
        font-weight: 700;
        font-size: 60px;
        text-align: left;
    }
    .welcome .pf-raleway span{
        font-weight: 400;
        color:#000;
    }
    #wel-top p{
        color:#000;
        font-family:'MuseoSans';
        font-size: 23px;
        margin-top: 24px;
        line-height: 29px;
        margin-bottom: 55px;
        width: 90%;
    }
    #wel-top .wel-btn{
        border: 4px solid #2b9285;
        font-weight: 600;
        font-size: 24px;
        padding: 10px 20px;
        color: #fdfff8;
    }
    #wel-top .play-video{
        position: relative;
    }
    #wel-top .wel-icon {
        position: absolute;
        left: 0%;
        right: 0;
        margin: auto;
        top: 30%;
    }
    #wel-top .pl-icon{
        top: 41%;
        left: 3%;
    }
    #wel-top .wel-icon.pl-hov, #wel-top .play-video:hover .pl-icon{
        display: none;
    }
    #wel-top .play-video:hover{
        cursor: pointer;
    }
    #wel-top .play-video:hover .pl-hov{
        display: block;
        width: 26%;
    }
    #wel-top .btn-about{
        background-color: #2b9285;
        margin-left: 30px;
    }
    #vidModal .modal-body > *{
        width: 100%!important;
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
    .container-fluid.no-margin-top {
        margin-top: 0;
    }
    @media(max-width: 767px){
        #wel-top.welcome{
            display: inherit;
            height: inherit;
            padding-bottom: 40px;
        }
        #wel-top .wel-btn{
            font-size: 14px;
        }
        #wel-top p{
            margin-top: 50px;
        }
        #wel-top .play-video{
            margin-top: 40px;
        }
    }
    @media(min-width: 992px) and (max-width: 1199px){
        #wel-top .pl-icon{
            width: 10%;
            top: 41%!important;
            left: 2%!important;
        }
        #wel-top .wel-icon{
            left: 0;
            top: 30%;
        }
        #wel-top .wel-btn{
            padding: 10px 20px;
        }
    }
    @media (max-width: 1199px){
        #wel-top .wel-btn{
            padding: 10px 20px;
        }
    }
    @media(max-width: 991px){
        #wel-top .pl-icon{
            width: 10%;
            top: 41%;
            left: 2%;
        }
        #wel-top .play-video:hover .pl-hov{
            width: 25%;
            left:0;
        }
    }
    .btn-secondary.disabled, .btn-secondary:disabled {
        background-color: #868e96;
        border-color: #868e96;
    }
</style>