<template>
    <div class="exchange">
        <div class="container" v-if="form.owner.username === $auth.user().username || manage === false">
            <b-row  align-h="center">
                <b-col sm="12" md="9">
                    <b-card :header="manage ? 'Exchange #'+id : 'Create a new exchange advertisement'"
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
                                   <h4>Trade type: {{manage ? form.tradeType : '' }}</h4>
                                    <b-form-radio-group v-if="!manage" name="tradeType" v-model="form.tradeType">
                                        <b-form-radio value="sell">Sell Coins</b-form-radio>
                                        <b-form-radio value="buy">Buy Coins</b-form-radio>
                                    </b-form-radio-group>
                                    <hr>
                                </b-col>
                            </b-row>
                            <b-row v-if="form.tradeType">
                                <b-col sm="12" md="7">
                                    <b-form-group label="Coin:" label-for="coin" :state="isValid('coin')" :feedback="errorMessage('coin')">
                                        <b-form-select :disabled="!!manage" id="coin" v-model="form.coin" :options="coinVariants" :state="isValid('coin')"></b-form-select>
                                    </b-form-group>
                                    <b-form-group label="Payment type:" label-for="paymentType" :state="isValid('paymentType')" :feedback="errorMessage('paymentType')">
                                        <b-form-select :disabled="!!manage" id="paymentType" v-model="form.paymentType" :options="paymentVariants" :state="isValid('paymentType')"></b-form-select>
                                    </b-form-group>
                                    <b-form-group label="Payment detail:" label-for="paymentTypeDetail" :state="isValid('paymentTypeDetail')" :feedback="errorMessage('paymentTypeDetail')">
                                        <b-form-input id="paymentTypeDetail" v-model="form.paymentTypeDetail" :state="isValid('paymentTypeDetail')"></b-form-input>
                                    </b-form-group>
                                </b-col>
                                <div class="clearfix"></div>
                                <b-col sm="12"><h4>More information:</h4></b-col>
                                <b-col sm="12" md="7">
                                    <b-form-group label="Currency:" label-for="currency" :state="isValid('currency')" :feedback="errorMessage('currency')">
                                        <b-form-select :disabled="!!manage" id="currency" v-model="form.currency" :options="currencyVariants" :state="isValid('currency')"></b-form-select>
                                    </b-form-group>
                                </b-col>
                                <div class="clearfix"></div>

                                <b-col sm="12" md="7">
                                    <b-form-group label="Rate:" label-for="rate" :state="isValid('rate')" :feedback="errorMessage('rate')">
                                        1{{form.coin}} = <b-form-input id="rate" v-model="form.rate" :state="isValid('rate')"></b-form-input>{{form.currency}}
                                    </b-form-group>
                                </b-col>

                                <div class="clearfix"></div>
                                <b-col sm="12" md="7">
                                    <label>
                                        <span>Limits:</span>
                                    </label>
                                    <b-row>
                                        <b-form-group class="col-sm-6">
                                            <b-input-group left="min">
                                                <b-input id="minLimit" v-model="form.limits.min" :state="isValid('limits')"></b-input>
                                                <b-input-group-addon slot="right">{{form.currency}}</b-input-group-addon>
                                            </b-input-group>
                                        </b-form-group>
                                        <b-form-group class="col-sm-6">
                                            <b-input-group left="max">
                                                <b-input id="maxLimit" v-model="form.limits.max" :state="isValid('limits')"></b-input>
                                                <b-input-group-addon slot="right">{{form.currency}}</b-input-group-addon>
                                            </b-input-group>
                                        </b-form-group>
                                        <b-form-group class="col-sm-12" :state="isValid('limits')" :feedback="errorMessage('limits')" ></b-form-group>
                                    </b-row>
                                </b-col>

                                <div class="clearfix"></div>
                                <b-col sm="12" md="7">
                                    <b-form-group label="Trade conditions:" label-for="conditions" :state="isValid('conditions')" :feedback="errorMessage('conditions')">
                                        <b-form-textarea id="conditions" v-model="form.conditions" :rows="6" :state="isValid('conditions')"></b-form-textarea>
                                    </b-form-group>
                                </b-col>
                            </b-row>
                            <b-button type="submit"  variant="primary" :disabled="(form.status === 'closed')">{{manage ? 'Save' : 'Create'}}</b-button>
                            <b-button v-if="manage" :disabled="(form.status === 'closed')" variant="danger" @click="closeExch">Close</b-button>
                        </b-form>
                    </b-card>
                </b-col>
            </b-row>
        </div>
    </div>
</template>
<script>
    export default {
        name: 'CreateExchange',
        props: ['id'],
        data: function () {
            return {
                userExchange: this.$props.id,
                manage: !!this.$props.id,
                form: {
                    tradeType: '',
                    coin: '',
                    paymentType: '',
                    paymentTypeDetail: '',
                    currency: 'USD',
                    rate: 0,
                    conditions: '',
                    limits: {
                        min: 1,
                        max: 10,
                    },
                    status: '',
                    owner: ''
                },
                coinVariants: [],
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
        created: function() {
            const vm = this;
            if (vm.manage) {
                vm.$http.get('/exchanges/' + this.$props['id']).then(response => {
                    vm.form = response.data.exchange;
                    if (!vm.form.limits) {
                        vm.form.limits = {
                            min: null,
                            max: null,
                        };
                    }
                }, err => {
                    console.log(err);
                });
            }
            vm.$http.get('/coins').then(response => {
                vm.coinVariants = response.data;
            }).catch (err => {
                console.log(err);
            })
        },
        methods: {
            onSubmit: function (e) {
                const vm = this;
                e.preventDefault();
                vm.errorMsg = '';
                if (this.manage){
                    let exch = {
                        paymentTypeDetail: vm.form.paymentTypeDetail,
                        rate: vm.form.rate,
                        conditions: vm.form.conditions,
                        limits: vm.form.limits,
                    };

                    this.$http.post('/exchanges/edit/' + this.id, exch).then(response => {
                        vm.$router.push({name: 'exchanges'});
                        vm.$swal('Success', 'Exchange was edited', 'success');
                    }, err => {
                        if (err.response.status === 400) {
                            vm.errors = err.response.data.errors;
                        }
                        if (err.response.status === 500) {
                            vm.errorMsg = 'Some error occured. Try again later';
                        }
                    });
                } else {
                        this.$http.post('/exchanges/create', this.form).then(response => {
                            vm.$router.push({name: 'exchanges'});
                            vm.$swal('Success', 'Exchange was created', 'success');
                        }, err => {
                            if (err.response.status === 400) {
                                vm.errors = err.response.data.errors;
                            }
                            if (err.response.status === 500) {
                                vm.errorMsg = 'Some error occured. Try again later';
                            }
                            if (err.response.status === 403) {
                                vm.$swal('Error', 'You do not have enough coins', 'error');
                            }
                        });
                }
            },
            isValid: function (key) {
                return this.errors.hasOwnProperty(key) ? 'invalid' : '';
            },
            errorMessage: function(key) {
                return this.errors.hasOwnProperty(key) ? this.errors[key].msg : '';
            },
            closeExch: function (e) {
                e.preventDefault();
                const vm = this;
                this.$http.post('/exchanges/close', {id: this.id}).then(response => {
                    vm.form.status = 'closed';
                }, err => {
                    console.log(err);
                });
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
            },
            'form.limits': function () {
                delete this.errors.limits;
            }
        }
    }
</script>
<style>

</style>