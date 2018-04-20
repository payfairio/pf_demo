<template>
    <div class="container">
        <div class="wallet">
            <b-row v-if="$auth.user().status === 'active'">
                <b-col md="4">
                    <b-card header="Your balance" class="currencies">
                        <div class="currency-header"><span>Currency</span><span class="right"><span>Total</span></span></div>
                        <div v-for="(count,name) in balance" :class="'currency' + (name == active_currency ? ' active' : '')" @click="changeCurrency(name)">
                            <span class="left">{{name}}</span><span class="right">{{count.total}}</span>
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
                            <b-button disabled v-if="balance[active_currency] ==0">Send</b-button>
                            <b-button v-if="balance[active_currency] != 0" type="submit" variant="primary">Send</b-button> <span v-if="sending"><img :src="$config.staticUrl+'/images/loading.gif'"> Transaction pending</span>
                        </b-form>
                    </b-card>

                </b-col>
            </b-row>


            <b-row v-if="$auth.user().status === 'active'">
                <b-col md="4">
                    <b-card header="Instruction">
                        <b-form>
                            <p style="font-weight: bolder">Go to the website <a href="https://www.myetherwallet.com/signmsg.html">https://www.myetherwallet.com/signmsg.html</a><br>
                                Unlock your wallet under "How would you like to access your wallet" <br>
                                Enter your PayFair <a style="color: red">USERNAME</a> in the Message window and click "Sign Message" <br>
                                Copy the "Signature" textbox field and paste it into the "Signature" field right<br>
                                Click "Check and add new wallet"<br>
                                If the wallet is signed correctly and sum of all wallets contains enough PFR (10,000 PFR minimum), it will be connected your profile</p>
                            <a style="color: red; font-weight: bolder">Use Ropsten accounts</a>
                        </b-form>
                    </b-card>
                </b-col>

                <b-col md="8">
                    <b-card :header="'Specify a new wallet'" class="send">
                        <b-form @submit="addConfirmWallet">
                            <b-form-group id="sigInputGroup" label="Signature" label-for="Signature">
                                <b-form-textarea id="sig" placeholder="Here must be your signature" :rows="8" v-model="textArea_form.text"></b-form-textarea>
                            </b-form-group>
                            <b-button type="submit" variant="primary">
                                Check and add wallet
                            </b-button>
                        </b-form>
                    </b-card>
                </b-col>

                <b-col md="4"></b-col>

                <b-col v-if="true" md="8" class="right">
                    <b-card header="Sign wallets">
                        <div v-for="note in trustWallet">
                            <b-button class="btn btn-sm btn-danger" v-on:click="removeSignWallet(note)">x</b-button> <span class="left">{{note.address}}</span><span style="font-weight: bold"> {{note.balancePfr}}</span>
                        </div>
                    </b-card>
                </b-col>
            </b-row>
        </div>
    </div>
</template>
<script>
export default {
    name: 'Wallet',
    data: function(){
        return {
            textArea_form:{
                text:''
            },

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

            trustWallet: [],
            active_currency: 'pfr',
            balance: {},
            address: '',
            sending: false,
        }
    },
    created: function(){
        this.updateBalance();
        const limit = Number.MAX_SAFE_INTEGER;
    },
    methods: {
        removeSignWallet: function (signWallet) {
            if (confirm('Are you sure want to delete the wallet?')) {
                let promise = this.$http.post('/wallet/removeSignWallet', {trustWallet: signWallet});

                return promise.then(res => {
                    this.$swal('Success', 'Wallet deleted', 'success');
                }).catch(err => {
                    this.$swal('Error', 'Wallet was not deleted', 'error');
                    console.log(err);
                })
            }
        },

        changeCurrency: function(name){
            this.active_currency = name;
            this.send_form.address = '';
            this.send_form.amount = '';
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

        //confirmWallet
        addConfirmWallet: function (e) {
            e.preventDefault();
            const vm = this;

            let address = '';
            let sig = '';
            let signmsg = this.textArea_form.text.replace(/\s/g,'').replace(/{/g,'').replace(/}/g,'').replace(/"/g,'').replace(/'/g,'').split(',');

            for (let i in signmsg){
                let currItem = signmsg[i].split(':');
                if (currItem[0].toLowerCase() === 'address'){
                    address = currItem[1];
                }
                if (currItem[0].toLowerCase() === 'sig'){
                    sig = currItem[1];
                }
            }
            let promise = this.$http.post('/wallet/addConfirmWallet', {address: address, sig: sig});
            return promise.then(res => {
                if (res.data.success === true){
                    vm.$swal('Success', 'Your Payfair Trust node has been activated', 'success');
                    vm.textArea_form.text = '';
                }
                else {
                    vm.$swal('Error', res.data.errorMsg , 'error');
                }
            }).catch( err => {
                vm.$swal('Error', 'There was a problem verifying your wallet', 'error');
            })
        },

        updateBalance: function () {
            let currUser = this.$auth.user();

            const balances = currUser.balances;
            const holds = currUser.holds;
            for (let i in balances) {
                if (!this.balance.hasOwnProperty(i)) {
                    this.balance[i] = {};
                }
                this.balance[i].total = balances[i];
            }
            this.trustWallet = currUser.trustWallet;
            this.address = currUser.address;
        },
        isValid: function (key) {
            return this.errors.hasOwnProperty(key) ? 'invalid' : '';
        },
        errorMessage: function(key) {
            return this.errors.hasOwnProperty(key) ? this.errors[key].msg : '';
        }
    },
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
        width: 100%;
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
