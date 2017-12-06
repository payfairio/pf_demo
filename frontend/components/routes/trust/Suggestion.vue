<template>
    <div class="suggestion-window">
        <b-row>
            <b-col md="8" sm="12">
                <b-card :header="suggestion.name">
                    <p class="card-text">
                        {{suggestion.text}}
                    </p>
                </b-card>
            </b-col>
            <b-col md="4" sm="12">
                <b-card header="About">
                    <p class="card-text">
                        <b>Author:</b> {{suggestion.author.username}}<br>
                        <b>Created at:</b> {{suggestion.created_at | date}}<br>
                        <b>Likes: </b>{{suggestion.like.length}} <a v-if="suggestion.can_vote" href="#" v-on:click="like">[vote]</a><br>
                        <b>Dislikes: </b>{{suggestion.dislike.length}} <a v-if="suggestion.can_vote" href="#" v-on:click="dislike">[vote]</a><br>
                        <b>Status: </b> {{suggestion.status}}
                    </p>
                </b-card>
            </b-col>
        </b-row>
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
                    text: '',
                    rating: 0,
                    like: [],
                    dislike: [],
                    can_vote: false,
                    status: 'Active'
                }
            };
        },
        methods: {
            successResponse: function(response){
                console.log(response);
                this.suggestion = response.data.suggestion;
                this.suggestion.can_vote = response.data.can_vote;
            },
            getSuggestion: function (ctx){
                let _this = this;
                let promise = this.$http.get('/suggestions/suggestion/' + this.id);
                return promise.then(this.successResponse, function(err){
                    console.log(err);
                });
            },
            vote: function(e, value){
                e.preventDefault();
                let _this = this;
                let promise = this.$http.post('/suggestions/suggestion/' + this.id + '/vote', {value: value});
                return promise.then(this.successResponse, function (err){
                    console.log(err);
                });
            },
            like: function(e){
                this.vote(e, 1);
            },
            dislike: function(e){
                this.vote(e, 0);
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
    .sug-block{
        background: #fff;
        border: 1px solid;
        padding: 10px;
        box-shadow: 1px 1px 1px rgba(0, 0, 0, 0.25);
    }
    .sug-text{
    }
</style>