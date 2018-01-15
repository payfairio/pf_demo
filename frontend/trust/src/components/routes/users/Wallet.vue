<template>
    <div class="wallet">
        <b-card v-if="false" header="History" id="history">
            <b-table>
                <b-table striped hover
                            :items="getHistory"
                            :fields="historyFields"
                            :current-page="currentPage"
                            :per-page="perPage"
                            sort-by="created_at"
                            :sort-desc="true"
                    >
                        <template slot="created_at" slot-scope="row">{{row.value | date}}</template>
                        <template slot="from" slot-scope="row">{{row.value}}</template>
                        <template slot="comment" slot-scope="row">{{row.value}}</template>
                        <template slot="amount" slot-scope="row">{{row.value}}</template>

                    </b-table>

                    <b-pagination :total-rows="totalRows" :per-page="perPage" v-model="currentPage" />
            </b-table>
        </b-card>
        <b-row>
            <b-col md="4">
                <b-card header="Your balance" class="currencies">
                    <div class="currency-header"><span>Currency</span><span class="right"><span>Total</span><span> (hold)</span></span></div>
                    <div v-for="(count,name) in balance" :class="'currency' + (name == active_currency ? ' active' : '')" @click="changeCurrency(name)">
                        <span class="left">{{name}}</span><span class="right">{{count.total}} ({{count.hold}})</span>
                    </div>
                </b-card>
            </b-col>
            <b-col md="8">
                <b-card :header="'Send ' + active_currency" class="send">
                    <b-form @submit="sendSubmit">
                        <b-form-group id="addressInputGroup" label="Receiving address:" label-for="address" :state="isValid('address')" :feedback="errorMessage('address')">
                            <b-form-input id="address" type="text" v-model="send_form.address" :state="isValid('address')"></b-form-input>
                        </b-form-group>
                        <b-form-group id="amountInputGroup" label="Amount:" label-for="amount" :state="isValid('amount')" :feedback="errorMessage('amount')">
                            <b-form-input id="amount" type="text" v-model="send_form.amount" :state="isValid('amount')"></b-form-input>
                        </b-form-group>
                        <b-button disabled v-if="balance[active_currency] == 0">Send</b-button>
                        <b-button v-if="balance[active_currency] != 0" type="submit" variant="primary">Send</b-button> <span v-if="sending"><img :src="$config.staticUrl+'/images/loading.gif'"> Transaction pending</span>
                    </b-form>
                </b-card>
                <b-card :header="'Receive ' + active_currency" class="send">
                    You can use this {{active_currency}} address:
                    <pre>{{address}}</pre>
                </b-card>
            </b-col>
        </b-row>
    </div>
</template>
<script>
export default {
    name: 'Wallet',
    data: function(){
        return {
            errors: [],
            currentPage: 1,
            perPage: 10,
            totalRows: 0,
            historyFields:{
                created_at: {label: 'Date', sortable: true},
                from: {label: 'From'},
                comment: {label: 'Comment'},
                amount: {label: 'Amount', sortable: true}
            },
            send_form:{
                address: '',
                amount: ''
            },
            active_currency: 'pfr',
            balance: {
                pfr: {total: 0, hold: 0},
                eth: {total: 0, hold: 0}
            },
            address: '',
            sending: false,
        }
    },
    created: function(){
        this.updateBalance();
        const limit = Number.MAX_SAFE_INTEGER;
        /*
        this.$http.get(`/history?limit=${limit}&offset=0&sortBy=name&order=false`)
            .then(response => {
                this.totalRows = response.data.length;
            });
        */
    },
    methods: {
        changeCurrency: function(name){
            this.active_currency = name;
            this.send_form.address = '';
            this.send_form.amount = '';
        },
        getHistory: function(ctx){
            const limit = ctx.perPage;
            const offset = (ctx.currentPage - 1) * ctx.perPage;
            const sortBy = ctx.sortBy;
            const order = ctx.sortDesc;

            /*
            let promise = this.$http.get(`/history?limit=${limit}&offset=${offset}&sortBy=${sortBy}&order=${order}`);
            return promise.then(function (response) {
                return(response.data || []);
            }, function (err) {
                return [];
            });
            */
        },
        sendSubmit: function(e){
            e.preventDefault();
            if (this.sending) {
                return false;
            }
            this.sending = true;
            let address = this.send_form.address;
            let amount = this.send_form.amount;
            let currency = this.active_currency;

            const vm = this;
            this.$http.post('/wallet/withdraw', {address: address, amount: amount, currency: currency}).then(function (response) {
                vm.sending = false;
                vm.$swal('Success', amount + ' ' + currency.toUpperCase() + ' was send to address: ' + address, 'success');
            }, function (err) {
                vm.sending = false;
                vm.$swal('Error', 'Some error occured. Be aware that transaction might still be mined! Check etherscan within 30 minutes.', 'error');
                console.log(err);
            });
        },
        updateBalance: function () {
            const balances = this.$auth.user().balances;
            const holds = this.$auth.user().holds;
            for (var i in balances) {
                this.balance[i].total = balances[i];
                this.balance[i].hold = holds[i];
            }

            this.address = this.$auth.user().address;
        },
        isValid: function (key) {
            return this.errors.hasOwnProperty(key) ? 'invalid' : '';
        },
        errorMessage: function(key) {
            return this.errors.hasOwnProperty(key) ? this.errors[key].msg : '';
        }
    }
}
</script>

<style scoped>
    .currency-header{
        padding: 0 10px;
        font-size: 14px;
        margin-bottom: 10px;
    }
    .currencies .card-body{
        padding-left: 0!important;
        padding-right: 0!important;
    }
    .currency{
        display: block;
        width: 100%;
        height: 40px;
        background: #f8f8f8;
        border-top: 1px solid #dedede;
        border-bottom: 1px solid #dedede;
        padding: 8px 10px;
        cursor: pointer;
    }
    .currency:not(:first-child){
        border-top: none;
    }
    .currency .left{
        float: left;
    }
    .currency .right{
        float: right;
    }
    .currency.active,
    .currency:hover{
        background: #16a2b8;
        color: #fff;
    }
    .tabs{
        margin-top: -20px;
    }
    .nav-tabs{
        padding: 0 10px;
    }
    .nav-links{
        border-top: none;
    }
    #history, .send{
        margin-bottom: 20px;
    }
</style>
