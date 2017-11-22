<template>
    <div class="exchange">
        <b-row align-h="center">
            <b-col sm="12" md="8">
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
                            <b-col sm="12" md="6">

                                <b-form-group label=":" label-for="currency" :state="isValid('currency')" :feedback="errorMessage('currency')">
                                    <b-form-select id="currency" v-model="form.currency" :options="currencyVariants" :state="isValid('currency')"></b-form-select>
                                </b-form-group>
                                <b-form-group label="You will get:" label-for="paymentType" :state="isValid('paymentType')" :feedback="errorMessage('paymentType')">
                                    <b-form-select id="paymentType" v-model="form.paymentType" :options="currencyVariants" :state="isValid('paymentType')"></b-form-select>
                                </b-form-group>
                            </b-col>
                            <b-col sm="12" md="6">
                                <b-form-group label="Your conditions:" label-for="conditions" :state="isValid('conditions')" :feedback="errorMessage('conditions')">
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
                    currency: 'fiat',
                    paymentType: 'PFR',
                    conditions: '',
                },
                currencyVariants: [
                    {
                        text: 'Fiat',
                        value: 'fiat'
                    },
                    {
                        text: 'PFR',
                        value: 'PFR'
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
            'form.currency': function () {
                delete this.errors.currency;
            },
            'form.paymentType': function () {
                delete this.errors.paymentType;
            },
            'form.conditions': function () {
                delete this.errors.conditions;
            }
        }
    }
</script>
<style>

</style>