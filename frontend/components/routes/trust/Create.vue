<template>
    <div class="suggestions-create">
        <b-row align-h="center">
            <b-col sm="12" md="8">
                <b-card header="Create new suggestion"
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
                                <b-form-group id="nameInputGroup" label="Suggestion name:" label-for="name" :state="isValid('name')" :feedback="errorMessage('name')">
                                    <b-form-input id="name" type="text" v-model="form.name" :state="isValid('name')"></b-form-input>
                                </b-form-group>
                                <b-form-group id="textInputGroup" label="Suggestion text:" label-for="text" :state="isValid('text')" :feedback="errorMessage('text')">
                                    <b-form-textarea id="text" v-model="form.text" :rows="6" :state="isValid('text')"></b-form-textarea>
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
        name: 'CreateSuggestion',
        data: function () {
            return {
                form: {
                    name: '',
                    text: ''
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
                this.$http.post('/suggestions/create', this.form).then(function (response) {
                    vm.$router.push({name: 'suggestion'});
                    vm.$swal('Success', 'Suggestion was created', 'success');
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
            'form.name': function () {
                delete this.errors.name;
            },
            'form.text': function () {
                delete this.errors.counterparty;
            }
        }
    }
</script>
<style>

</style>