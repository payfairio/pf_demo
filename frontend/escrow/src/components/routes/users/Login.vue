<template>
    <div class="login">
        <b-row align-h="center">
            <b-col sm="12" md="5">
                <b-card header="Login"
                        align="left">
                    <b-alert variant="danger"
                             dismissible
                             :show="errorMsg != ''"
                             @dismissed="errorMsg=''">
                        {{errorMsg}}
                    </b-alert>
                    <b-form @submit="onSubmit">
                        <b-form-group id="emailInputGroup" label="Email address:" label-for="email" :state="isValid('email')" :feedback="errorMessage('email')">
                            <b-form-input id="email" type="text" v-model="form.email" :state="isValid('email')"></b-form-input>
                        </b-form-group>
                        <b-form-group id="passwordInputGroup" label="Password:" label-for="password" :state="isValid('password')" :feedback="errorMessage('password')">
                            <b-form-input id="password" type="password" v-model="form.password" :state="isValid('password')"></b-form-input>
                        </b-form-group>
                        <b-button type="submit" variant="primary">Login</b-button>
                    </b-form>
                </b-card>
            </b-col>
        </b-row>
    </div>
</template>
<script>
    export default {
        name: 'Login',
        data: function () {
            return {
                form: {
                    email: '',
                    password: ''
                },
                errors: {},
                errorMsg: ''
            }
        },
        methods: {
            onSubmit: function (e) {
                const vm = this;
                e.preventDefault();
                vm.errorMsg = '';
                this.$auth.login({
                    data: this.form,
                    success: function (response) {
                        vm.$socket.connect(vm.$config.staticUrl);
                    },
                    error: function (err) {
                        if (err.response.status === 400) {
                            vm.errors = err.response.data.errors;
                        }
                        if (err.response.status === 401) {
                            this.errorMsg = err.response.data.msg;
                        }
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
            'form.email': function () {
                delete this.errors.email;
            },
            'form.password': function () {
                delete this.errors.password;
            },
        }
    }
</script>
<style>

</style>