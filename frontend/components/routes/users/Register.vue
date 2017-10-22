<template>
    <div class="register">
        <b-row align-h="center">
            <b-col sm="12" md="5">
                <b-card header="Register"
                        align="left">
                    <p v-if="invite">Please choose username and password</p>
                    <b-form @submit="onSubmit">
                        <b-form-group id="usernameInputGroup" label="Username:" label-for="username" :state="isValid('username')" :feedback="errorMessage('username')">
                            <b-form-input id="username" type="text" v-model="form.username" :state="isValid('username')"></b-form-input>
                        </b-form-group>
                        <b-form-group v-if="!invite" id="emailInputGroup" label="Email address:" label-for="email" :state="isValid('email')" :feedback="errorMessage('email')">
                            <b-form-input id="email" type="text" v-model="form.email" :state="isValid('email')"></b-form-input>
                        </b-form-group>
                        <b-form-group id="passwordInputGroup" label="Password:" label-for="password" :state="isValid('password')" :feedback="errorMessage('password')">
                            <b-form-input id="password" type="password" v-model="form.password" :state="isValid('password')"></b-form-input>
                        </b-form-group>
                        <b-form-group v-if="!invite" id="typeInputGroup" label="Account type:" label-for="type" :state="isValid('type')" :feedback="errorMessage('type')">
                            <b-form-select id="type" v-model="form.type" :options="typeVariants" :state="isValid('type')"></b-form-select>
                        </b-form-group>
                        <b-button type="submit" variant="primary">Register</b-button>
                    </b-form>
                </b-card>
            </b-col>
        </b-row>
    </div>
</template>
<script>
    export default {
        name: 'Register',
        props: [
            'invId'
        ],
        created: function () {
            const vm = this;
            if (vm.invId) {
                vm.$http.get('/users/getinv/'+vm.invId).then(function (response) {
                    vm.form.email = response.data.email;
                }).catch(function (err) {
                    vm.invite = null;
                });
            }
        },
        data: function () {
            return {
                form: {
                    username: '',
                    email: '',
                    password: '',
                    type: 'client',
                },
                invite: this.invId,
                typeVariants: [
                    {
                        text: 'Client',
                        value: 'client'
                    },
                    {
                        text: 'Escrow-node',
                        value: 'escrow'
                    },
                    /*{
                        text: 'Trust-node',
                        value: 'trust'
                    }*/
                ],
                errors: {}
            }
        },
        methods: {
            onSubmit: function (e) {
                const vm = this;
                e.preventDefault();
                if (!vm.invite) {
                    this.$auth.register({
                        data: this.form,
                        success: function (response) {
                            vm.$socket.emit('authenticate', {token: vm.$auth.token().substr(4)});
                        },
                        error: function (err) {
                            if (err.response.status === 400) {
                                vm.errors = err.response.data.errors;
                            }
                        },
                        autoLogin: true,
                    });
                } else {
                    vm.$http.post('/users/acceptinv/'+this.invite, this.form).then(function (response) {
                        vm.$socket.emit('authenticate', {token: vm.$auth.token().substr(4)});
                        vm.$auth.login({
                            data: vm.form
                        })
                    }).catch(function (err) {
                        if (err.response.status === 400) {
                            vm.errors = err.response.data.errors;
                        }
                    });
                }
            },
            isValid: function (key) {
                return this.errors.hasOwnProperty(key) ? 'invalid' : '';
            },
            errorMessage: function(key) {
                return this.errors.hasOwnProperty(key) ? this.errors[key].msg : '';
            }
        },
        watch: {
            'form.username': function () {
                delete this.errors.username;
            },
            'form.email': function () {
                delete this.errors.email;
            },
            'form.password': function () {
                delete this.errors.password;
            },
            'form.type': function () {
                delete this.errors.type;
            }
        }
    }
</script>
<style>

</style>