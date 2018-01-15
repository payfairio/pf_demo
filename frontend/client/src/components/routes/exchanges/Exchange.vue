<template>
    <div id="exchange">
        <b-row>
            <b-col sm="12" md="7">
                <b-card :header="'Exchange #' + id">
                    <div class="info">
                        <p><b>Owner:</b> {{owner.username}}</p>
                        <p><b>Coin:</b> {{coin}}</p>
                        <p><b>Currency:</b> {{currency}}</p>
                        <p><b>Payment:</b> {{paymentType}}{{paymentTypeDetail ? ' (' + paymentTypeDetail + ')' : ''}}</p>
                        <p><b>Rate:</b> {{rate}}</p>
                        <p><b>Created at:</b> {{created_at}}</p>
                        <p><b>Status:</b> {{status}}</p>
                        <p><b>Conditions:</b> <br>{{conditions}}</p>
                    </div>
                    <b-form-group v-if="owner.username != $auth.user().username" id="sumInputGroup" label="Input sum:" label-for="sum" :state="isValid('sum')" :feedback="errorMessage('sum')">
                        <b-form-input id="sum" step="any" v-model="sum" :state="isValid('sum')"></b-form-input>
                    </b-form-group>
                    <div v-if="$auth.check()">
                        <b-button disabled v-if="owner.username == $auth.user().username || status == 'closed'">{{tradeType == 'buy' ? 'sell' : 'buy'}}</b-button>
                        <b-button v-if="owner.username != $auth.user().username && status != 'closed'" variant="primary" @click="acceptExchange">{{tradeType == 'buy' ? 'sell' : 'buy'}}</b-button>
                    </div>
                    <div v-if="!$auth.check()">
                        Please sign in for {{tradeType}} coins: <router-link :to="{name: 'login'}" class="btn btn-success">Login</router-link>
                    </div>
                </b-card>
            </b-col>
            <b-col sm="12" md="5">
                <b-card :header="owner.username + ' reviews'">
                    <h5><b>Total Rating: </b> {{reviews.length > 0 ? totalRating : 'no reviews'}}</h5>
                    <hr>
                    <div v-for="review in reviews" class="review">
                        <p>
                            <b>By:</b> <router-link :to="{name: 'user-by-id', params: {id: review.author._id}}">{{review.author.username}}</router-link><br>
                            <!-- <b>Rating:</b> {{review.rating}}<br>
                            <b>Comment:</b><br> -->
                        </p>
                        <p class="float-left">Rating:</p>
                        <div v-for="i in review.rating">
                            <span></span>
                        </div>
                        <p>{{review.comment}}</p>
                        <hr>
                    </div>
                </b-card>
            </b-col>
        </b-row>
    </div>
</template>
<script>
export default {
    name: 'Exchange',
    props: ['id'],
    created: function(){
        this.getExchange();
    },
    data: function(){
        return {
            owner: {
                username: ''
            },
            tradeType: '',
            coin: '',
            currency: '',
            paymentType: '',
            paymentTypeDetail:'',
            rate: '',
            created_at: '',
            status: '',
            conditions: '',
            reviews: [],
            totalRating: 0,
            errors: {},
            errorMsg: '',
            sum: 0
        }
    },
    methods: {
        getExchange: function(){
            const vm = this;
            this.$http.get('/exchanges/' + this.id).then(function(response){
                let exch = response.data.exchange;
                vm._id = exch._id;
                vm.coin = exch.coin;
                vm.conditions = exch.conditions;
                vm.created_at = (new Date(exch.created_at)).toLocaleString();
                vm.currency = exch.currency;
                vm.owner = exch.owner;
                vm.paymentType = exch.paymentType;
                vm.rate = exch.rate;
                vm.status = exch.status;
                vm.tradeType = exch.tradeType;
                vm.paymentTypeDetail = exch.paymentTypeDetail;

                vm.reviews = response.data.reviews;
                if (vm.reviews.length > 0){
                    for (let i in vm.reviews){
                        vm.totalRating += vm.reviews[i].rating;
                    }
                } else {
                    vm.totalRating = 0;
                }
                vm.totalRating /= vm.reviews.length;
            }, function(err){
                console.log(err);
            });
        },
        acceptExchange: function(e){
            e.preventDefault();
            const vm = this;

            this.$http.post('/deals/exchange', {exchange: this._id, sum: this.sum}).then(function (response) {
                vm.$router.push({name: 'deal', params: {id: response.data.deal.dId}});
                vm.$swal('Success', 'Deal was created', 'success');
            }, function (err) {
                console.log(err);
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
        'sum': function () {
            delete this.errors.sum;
        }
    }
}
</script>
<style scoped>
.review span {
    width: 20px;
    height: 20px;
}
.review p{
    clear:both;
}
.review div{
    float: left;
    margin-left: 5px;
}
</style>
