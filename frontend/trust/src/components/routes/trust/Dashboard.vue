<template>
    <div class="container">
        <div class="dashboard">
            <b-row align-h="center">
                <b-col sm="12" md="3">
                    <b-card header="LINKED TRUST NODE" align="left">
                        <div>
                            <span class="left">Your nodes:</span> <span style="font-weight: bold" class="right">{{dataDashBoard.countNode}} </span> <br>
                            <span class="left">Your balance:</span> <span style="font-weight: bold" class="right">{{+Number(dataDashBoard.balancePfr).toFixed(6)}}</span> <br>
                        </div>
                        <hr>
                        <span class="left">Total number of nodes:</span> <span style="font-weight: bold" class="right">{{dataDashBoard.totalNode}} </span>
                        <hr>
                        <span>Amount next payout:</span>
                        <div v-for="item in dataDashBoard.arrAmountPayOut">
                            <span class="left">{{item.name.toUpperCase()}}</span><span style="font-weight: bold" class="right">{{item.amount}}</span>
                        </div>
                        <hr>
                        <div>
                            <span class="left">Total active deals:</span> <span style="font-weight: bold" class="right">{{dataDashBoard.countActiveDeals}}</span> <br>
                            <span class="left">Total users:</span> <span style="font-weight: bold" class="right">{{dataDashBoard.countUsers}}</span>
                        </div>
                        <hr>
                        <div>
                            <span class="left">Total escrow:</span> <span style="font-weight: bold" class="right">{{dataDashBoard.countEscrow}}</span> <br>
                        </div>
                        <div>

                        </div>
                    </b-card>
                </b-col>
                <b-col sm="12" md="9">
                        <b-card header="History of payouts"
                                align="left">
                            <b-table striped hover
                                     :items="dataDashBoard.payOutUser"
                                     :fields="fields"
                            >
                                <template slot="date" slot-scope="row">{{row.value}}</template>
                                <template slot="coinName" slot-scope="row">{{row.value.toUpperCase()}}</template>
                                <template slot="amount" slot-scope="row">{{row.value}}</template>
                            </b-table>
                        </b-card>
                </b-col>
            </b-row>
        </div>
    </div>
</template>
<script>
    export default {

        data: function () {
            return {
                dataDashBoard: {
                    payOutUser: [],
                    arrAmountPayOut: [],
                    //
                    countNode: '',
                    balancePfr: '',
                    totalNode: 0,
                    countActiveDeals: 0,
                    countUsers: 0,
                    countEscrow: 0,
                },

                fields: {
                    date: {label: 'Date'},
                    coinName: {label: 'Coin'},
                    amount: {label: 'Sum'},
                },
            }
        },

        created: function () {
            this.getDashboard();
        },
        methods: {
            getDashboard: function () {
                this.$http.get(`/users/dashboard`).then(res => {
                    this.dataDashBoard = res.data.dataDashBoard;
                }).catch(err => {
                    console.log(err)
                });
            }
        },
    }
</script>
<style>

</style>