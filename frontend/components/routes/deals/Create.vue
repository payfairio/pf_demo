<template>
    <div class="deals-create">
        <b-row align-h="center">
            <b-col sm="12" md="5">
                <b-card header="Create new deal"
                        align="left">
                    <b-form @submit="onSubmit">
                        <b-form-group id="roleInputGroup" label="Your role in a deal:" label-for="role" :state="isValid('role')" :feedback="errorMessage('role')">
                            <b-form-select id="role" v-model="form.role" :options="roleVariants" :state="isValid('role')"></b-form-select>
                        </b-form-group>
                        <b-form-group id="nameInputGroup" label="Deal name:" label-for="name" :state="isValid('name')" :feedback="errorMessage('name')">
                            <b-form-input id="name" type="text" v-model="form.name" :state="isValid('name')"></b-form-input>
                        </b-form-group>
                        <b-form-group id="counterPartyInputGroup" label="Counterparty email:" label-for="counterparty" :state="isValid('counterparty')" :feedback="errorMessage('counterparty')">
                            <b-form-input id="counterparty" type="text" v-model="form.counterparty" :state="isValid('counterparty')"></b-form-input>
                        </b-form-group>
                        <b-button type="submit" variant="primary">Create</b-button>
                    </b-form>
                </b-card>
            </b-col>
        </b-row>
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
                errors: {}
            }
        },
        methods: {
            onSubmit: function (e) {
                const vm = this;
                e.preventDefault();
                this.$http.post('/deals/create', this.form).then(function (response) {
                    vm.$router.push({name: 'deals'});
                    vm.$swal('Success', 'Deal was created', 'success');
                }, function (err) {
                    if (err.response.status === 400) {
                        vm.errors = err.response.data.errors;
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