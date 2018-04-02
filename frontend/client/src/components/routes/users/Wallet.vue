<template>
    <div class="wallet">
        <div class="container">
            <b-row>
                <b-col md="4">
                    <b-card header="Your balance" class="currencies">
                        <div class="currency-header"><span>Currency</span><span class="right"><span>Total</span><span> (hold)</span></span></div>
                        <div v-for="(count, name) in balance" :class="'currency' + (name == active_currency ? ' active' : '')" @click="changeCurrency(name)">
                            <span class="left">{{name.toUpperCase()}}</span><span class="right">{{count.total}} ({{count.hold}})</span>
                        </div>
                    </b-card>

                    <b-card header="History" class="currencies">
                        <div v-for="note in history" :class="'currency' + (note === active_currency ? ' active' : '')" @click="openHistory(note)">
                            <span :style="note.charge ? 'color: green' : 'color: red'" class="left">{{note.amount}} {{note.coinName.toUpperCase()}}</span>
                            <span v-if="!note.address && note.address !== null" class="right">{{note.charge ? `from ${note.fromUser}`  : `to ${note.toUser}`}}</span>
                            <span v-else class="right">{{note.charge ? `received`  : `withdrawal`}}</span>
                        </div>
                    </b-card>
                    <b-pagination :total-rows="totalRows" :per-page="perPage" v-model="currentPage" @input="getHistory" />
                </b-col>
                <b-col md="8">
                    <b-card :header="'Send ' + active_currency.toUpperCase()" class="send">
                        <b-form @submit="sendSubmit">
                            <span style="color:red">To transfer "pfr" and "omg", there must be " eth " in your account.</span>
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
                    <b-card :header="'Receive ' + active_currency.toUpperCase()" class="send">
                        You can use this {{active_currency}} address:
                        <pre>{{address}}</pre>
                        <font color="red"> Please do not send REAL tokens to this address, you will lose them! The address is only for demonstration into the Ropsten network.</font>
                    </b-card>
                </b-col>
            </b-row>
        </div>

        <b-modal v-model="historyModal" :title="activeHistory.charge ? 'Getting coins' : 'Transfer coins'">
            <span style="font-weight: bold">{{activeHistory.date | moment("MMMM Do YYYY, HH:mm:ss")}}</span>
            <div v-if="!activeHistory.address && activeHistory.address !== null">
                <span class="left" v-if="activeHistory.charge">Received from <a style="font-weight: bold">{{activeHistory.fromUser}}</a> <br>
                    <a style="color: green; font-weight: bold">{{activeHistory.amount}} {{activeHistory.coinName}}</a>
                </span>
                <span class="left" v-else>Transferred to <a style="font-weight: bold">{{activeHistory.toUser}}</a> <br>
                    <a style="color: red; font-weight: bold">{{activeHistory.amount}} {{activeHistory.coinName}}</a>
                </span>
            </div>
            <div v-else>
                <span class="left" v-if="activeHistory.charge">Received <br>
                    <a style="color: green; font-weight: bold">{{activeHistory.amount}} {{activeHistory.coinName}}</a>
                </span>
                <span class="left" v-else>Transferred to <a style="font-weight: bold">{{activeHistory.address}}</a> <br>
                    <a style="color: red; font-weight: bold">{{activeHistory.amount}} {{activeHistory.coinName}}</a>
                </span>
            </div>
            <div slot="modal-footer" class="w-100">
                <b-btn size="sm" class="float-right" @click="historyModal = false">Cancel</b-btn>
            </div>
        </b-modal>
    </div>


</template>
<script>
    export default {
        name: 'Wallet',
        data: () => {
            return {
                errors: [],
                history:[],
                currentPage: 1,
                perPage: 7,
                totalRows: 0,

                send_form:{
                    address: '',
                    amount: ''
                },
                active_currency: 'pfr',
                balance: {},
                address: '',
                sending: false,

                historyModal: false,
                activeHistory: '',
            }
        },
        created: function(){
            this.updateBalance();
            this.getHistory();
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
            /*getHistory: function(ctx){
                const limit = ctx.perPage;
                const offset = (ctx.currentPage - 1) * ctx.perPage;
                const sortBy = ctx.sortBy;
                const order = ctx.sortDesc;

                 let promise = this.$http.get(`/history?limit=${limit}&offset=${offset}&sortBy=${sortBy}&order=${order}`);
                 return promise.then(function (response) {
                 return(response.data || []);
                 }, function (err) {
                 return [];
                 });
            },*/
            getHistory: function () {
                const vm = this;

                let offset = (vm.currentPage - 1) * vm.perPage;
                let limit = offset + Number(vm.perPage);

                this.$http.get(`/wallet/history?limit=${limit}&offset=${offset}`).then(res =>{
                    this.history = res.data.history;
                    this.totalRows = res.data.total;
                }, err => {

                })
            },

            openHistory: function (note) {
                this.historyModal = true;
                this.activeHistory = note;
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
                this.$http.post('/wallet/withdraw', {address: address, amount: amount, currency: currency}).then(response => {
                    vm.sending = false;
                    vm.$swal('Success', amount + ' ' + currency.toUpperCase() + ' was send to address: ' + address, 'success');
                }, err => {
                    vm.sending = false;
                    vm.$swal('Error', 'Some error occured. Be aware that transaction might still be mined! Check etherscan within 30 minutes.', 'error');
                    console.log(err);
                });
            },
            updateBalance: function () {
                const balances = this.$auth.user().balances;
                const holds = this.$auth.user().holds;
                for (let i in balances) {
                    if (!this.balance.hasOwnProperty(i)) {
                        this.balance[i] = {};
                    }
                    this.balance[i].total = balances[i];
                    this.balance[i].hold = holds[i];
                }

                this.address = this.$auth.user().address;
            },
            isValid: function (key) {
                return this.errors.hasOwnProperty(key) ? 'invalid' : '';
            },
            errorMessage: function (key) {
                return this.errors.hasOwnProperty(key) ? this.errors[key].msg : '';
            }
        }
    }
</script>

<style scoped>
    .currencies{
        width: 100%;
    }

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
