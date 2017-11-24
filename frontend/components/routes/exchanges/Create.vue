<template>
    <div class="exchange">
        <b-row align-h="center">
            <b-col sm="12" md="9">
                <b-card header="Create new exchange advertisment"
                        align="left">
                    <b-alert variant="danger"
                             dismissible
                             :show="errorMsg != ''"
                             @dismissed="errorMsg=''">
                        {{errorMsg}}
                    </b-alert>
                    <b-form @submit="onSubmit">
                        <b-row>
                            <b-col sm="12">
                               <h4>Trade type:</h4>
                                <b-form-radio-group name="tradeType" v-model="form.tradeType">
                                    <b-form-radio value="sell">Sell your coins</b-form-radio>
                                    <b-form-radio value="buy">Buy coins</b-form-radio>
                                </b-form-radio-group>
                                <hr>
                            </b-col>
                        </b-row>
                        <b-row v-if="form.tradeType">
                            <b-col sm="12" md="7">
                                <b-form-group label="Coin:" label-for="coin" :state="isValid('coin')" :feedback="errorMessage('coin')">
                                    <b-form-select id="coin" v-model="form.coin" :options="coinVariants" :state="isValid('coin')"></b-form-select>
                                </b-form-group>
                                <b-form-group label="Payment type:" label-for="paymentType" :state="isValid('paymentType')" :feedback="errorMessage('paymentType')">
                                    <b-form-select id="paymentType" v-model="form.paymentType" :options="paymentVariants" :state="isValid('paymentType')"></b-form-select>
                                </b-form-group>
                            </b-col>
                            <div class="clearfix"></div>
                            <b-col sm="12"><h4>More information:</h4></b-col>
                            <b-col sm="12" md="7">
                                <b-form-group label="Currency:" label-for="currency" :state="isValid('currency')" :feedback="errorMessage('currency')">
                                    <b-form-select id="currency" v-model="form.currency" :options="currencyVariants" :state="isValid('currency')"></b-form-select>
                                </b-form-group>
                            </b-col>
                            <div class="clearfix"></div>
                            <b-col sm="12" md="7">
                                <b-form-group label="Rate:" label-for="rate" :state="isValid('rate')" :feedback="errorMessage('rate')">
                                    <b-form-input id="rate" v-model="form.rate" :state="isValid('rate')"></b-form-input>
                                </b-form-group>
                            </b-col>
                            <div class="clearfix"></div>
                            <b-col sm="12" md="7">
                                <b-form-group label="Trade conditions:" label-for="conditions" :state="isValid('conditions')" :feedback="errorMessage('conditions')">
                                    <b-form-textarea id="conditions" v-model="form.conditions" :rows="6" :state="isValid('conditions')"></b-form-textarea>
                                </b-form-group>
                            </b-col>
                        </b-row>
                        <b-button type="submit" variant="primary">Create</b-button>
                    </b-form>
                </b-card>
            </b-col>
        </b-row>
    </div>
</template>
<script>
    export default {
        name: 'CreateExchange',
        data: function () {
            return {
                form: {
                    tradeType: '',
                    coin: '',
                    paymentType: '',
                    currency: 'USD',
                    rate: 0,
                    conditions: '',
                },
                coinVariants: [
                    {
                        text: 'ETH',
                        value: 'ETH'
                    },
                    {
                        text: 'PFR',
                        value: 'PFR'
                    }
                ],
                paymentVariants: [
                    {
                        text: 'Transfers with specific bank',
                        value: 'Transfers with specific bank',
                    },
                    {
                        text: 'Cash deposit',
                        value: 'Cash deposit',
                    }
                ],
                currencyVariants: [
                    {
                        text: 'USD',
                        value: 'USD'
                    },
                    {
                        text: 'RUB',
                        value: 'RUB'
                    },
                ],
                errors: {},
                errorMsg: ''
            }
        },
        methods: {
            onSubmit: function (e) {
                const vm = this;
                e.preventDefault();
                vm.errorMsg = '';
                this.$http.post('/exchanges/create', this.form).then(function (response) {
                    vm.$router.push({name: 'exchanges'});
                    vm.$swal('Success', 'Exchange was created', 'success');
                }, function (err) {
                    if (err.response.status === 400) {
                        vm.errors = err.response.data.errors;
                    }
                    if (err.response.status === 500) {
                        vm.errorMsg = 'Some error occured. Try again later';
                    }
                });
            },
            isValid: function (key) {
                return this.errors.hasOwnProperty(key) ? 'invalid' : '';
            },
            errorMessage: function(key) {
                return this.errors.hasOwnProperty(key) ? this.errors[key].msg : '';
            }
        },
        watch: {
            'form.tradeType': function () {
                delete this.errors.tradeType;
            },
            'form.coin': function () {
                delete this.errors.coin;
            },
            'form.paymentType': function () {
                delete this.errors.paymentType;
            },
            'form.currency': function () {
                delete this.errors.currency;
            },
            'form.rate': function () {
                delete this.errors.rate;
            },
            'form.conditions': function () {
                delete this.errors.conditions;
            }
        }
    }
</script>
<style>

</style>