<template>
    <div class="reset">
        <div class="container">
            <b-row align-h="center">
                <b-col sm="12" md="5">
                    <b-card v-if="!code || !email" header="Reset Password"
                            align="left">
                        <b-alert variant="danger"
                                 dismissible
                                 :show="errorMsg != ''"
                                 @dismissed="errorMsg=''">
                            {{errorMsg}}
                        </b-alert>
                        <b-form @submit="sendEmail">
                            <b-form-group id="emailInputGroup" label="Email address:" label-for="email" :state="isValid('email')" :feedback="errorMessage('email')">
                                <b-form-input id="email" type="text" v-model="form.email" :state="isValid('email')"></b-form-input>
                            </b-form-group>
                            <b-button type="submit" variant="primary">Reset</b-button>
                        </b-form>
                    </b-card>

                    <b-card v-else :header="'Reset Password for ' + email "
                            align="left">
                        <b-form @submit="resetPassword">
                            <b-form-group id="passwordInputGroup" label="Password:" label-for="password" :state="isValid('password')" :feedback="errorMessage('email')">
                                <b-form-input id="password" type="password" v-model="form.password" :state="isValid('password')"></b-form-input>
                            </b-form-group>
                            <b-button type="submit" variant="primary">Reset</b-button>
                        </b-form>
                    </b-card>
                </b-col>
            </b-row>
        </div>
    </div>
</template>
<script>
    export default {
        name: 'Reset',
        props: [
            'code',
        ],
        created: function () {
            const vm = this;
            if (vm.code) {
                vm.$http.get('/users/reset/' + vm.code).then(function (response) {
                    vm.email = response.data.email;
                }).catch(function (err) {
                    console.log(err.response);
                    if (err.response.data.error.msg) {
                        vm.errorMsg = err.response.data.error.msg; 
                    }
                });
            }
        },
        data: function () {
            return {
                email: null,
                form: {
                    email: '',
                },
                errors: {},
                errorMsg: ''
            }
        },
        methods: {
            resetPassword: function (e) {
                const vm = this;
                e.preventDefault();
                vm.errorMsg = '';
                if (vm.code && vm.email) {
                    vm.$http
                        .post('/users/reset/' + this.code, {password: vm.form.password})
                        .then(function (response) {
                            vm.$router.push({name: 'login'});
                            vm.$swal('Success', 'Password was changed', 'success');
                        })
                        .catch(function (err) {
                            if (err.response.status === 400) {
                                vm.errors = err.response.data.errors;
                            }
                        });
                }
            },
            sendEmail: function (e) {
                const vm = this;
                e.preventDefault();
                vm.errorMsg = '';
                vm.$http.post('/users/reset/', {email: vm.form.email}).then(function (response) {
                    vm.$swal('Success', 'Check your email', 'success');
                }).catch(function (err) {
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
            'form.email': function () {
                delete this.errors.email;
            }
        }
    }
</script>
<style>

</style>