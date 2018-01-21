<template>
    <div class="deals-create">
        <div class="container">
            <b-row align-h="center">
                <b-col sm="12" md="8">
                    <b-card header="Create new deal"
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
                                    <b-form-group id="roleInputGroup" label="Your role in a deal:" label-for="role" :state="isValid('role')" :feedback="errorMessage('role')">
                                        <b-form-select id="role" v-model="form.role" :options="roleVariants" :state="isValid('role')"></b-form-select>
                                    </b-form-group>
                                    <b-form-group id="nameInputGroup" label="Deal name:" label-for="name" :state="isValid('name')" :feedback="errorMessage('name')">
                                        <b-form-input id="name" type="text" v-model="form.name" :state="isValid('name')"></b-form-input>
                                    </b-form-group>
                                    <b-form-group id="counterPartyInputGroup" label="Counterparty email:" label-for="counterparty" :state="isValid('counterparty')" :feedback="errorMessage('counterparty')">
                                        <b-form-input id="counterparty" type="text" v-model="form.counterparty" :state="isValid('counterparty')"></b-form-input>
                                    </b-form-group>
                                </b-col>
                                <b-col sm="12" md="6">
                                    <b-form-group id="sumInputGroup" label="Deal sum:" label-for="sum" :state="isValid('sum')" :feedback="errorMessage('sum')">
                                        <b-form-input id="sum" type="number" step="any" v-model="form.sum" :state="isValid('sum')"></b-form-input>
                                    </b-form-group>
                                    <b-form-group id="coinInputGroup" label="Currency:" label-for="coin" :state="isValid('coin')" :feedback="errorMessage('coin')">
                                        <b-form-select id="coin" v-model="form.coin" :options="coinVariants" :state="isValid('coin')"></b-form-select>
                                    </b-form-group>
                                </b-col>
                            </b-row>
                            <b-form-group id="conditionsInputGroup" label="Your conditions:" label-for="conditions" :state="isValid('conditions')" :feedback="errorMessage('conditions')">
                                <b-form-textarea id="conditions" v-model="form.conditions" :rows="6" :state="isValid('conditions')"></b-form-textarea>
                            </b-form-group>
                            <b-button type="submit" variant="primary">Create</b-button>
                        </b-form>
                    </b-card>
                </b-col>
            </b-row>
        </div>
    </div>
</template>
<script>
    export default {
        name: 'CreateDeal',
        data: function () {
            return {
                form: {
                    role: 'buyer',
                    name: '',
                    counterparty: '',
                    conditions: '',
                    sum: 0,
                    coin: 'pfr'
                },
                roleVariants: [
                    {
                        text: 'Buyer',
                        value: 'buyer'
                    },
                    {
                        text: 'Seller',
                        value: 'seller'
                    },
                ],
                coinVariants: [
                    {
                        text: 'PFR',
                        value: 'pfr'
                    },
                    {
                        text: 'ETH',
                        value: 'eth'
                    }
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
                this.$http.post('/deals/create', this.form).then(function (response) {
                    vm.$router.push({name: 'deals'});
                    vm.$swal('Success', 'Deal was created', 'success');
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
            'form.role': function () {
                delete this.errors.role;
            },
            'form.name': function () {
                delete this.errors.name;
            },
            'form.counterparty': function () {
                delete this.errors.counterparty;
            }
        }
    }
</script>
<style>

</style>