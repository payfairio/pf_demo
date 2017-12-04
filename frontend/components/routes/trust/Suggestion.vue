<template>
    <div class="suggestion-window">
        <h2>{{suggestion.name}}</h2>
        <b-row>
            <b-col md="6" align="left">
                Author: {{suggestion.author.username}}
            </b-col>
            <b-col md="6" align="right">
                Created at: {{suggestion.created_at | date}}
            </b-col>
        </b-row>
        <p class="sug-text">{{suggestion.text}}</p>
    </div>
</template>
<script>
    export default {
        name: 'Suggestion',
        props: ['id'],
        created: function () {
            this.getSuggestion();
        },
        data: function () {
            return {
                suggestion: {
                    name: '',
                    author: '',
                    created_at: '',
                    text: ''
                }
            };
        },
        methods: {
            getSuggestion: function (ctx){
                let _this = this;
                let promise = this.$http.get('/suggestions/suggestion/' + this.id);
                return promise.then(function (response){
                    _this.suggestion = response.data;
                }, function(err){
                    _this.suggestion = err;
                });
            }
        },
        filters: {
            date: function (value) {
                return (new Date(value)).toLocaleString();
            }
        },
    }
</script>
<style scoped>
    .sug-text{
        background: #fff;
        margin-top: 10px;
        padding: 10px;
        border: 1px solid #333;
    }
</style>