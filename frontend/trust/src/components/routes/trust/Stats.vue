<template>
    <div class="container">
        <div class="stats">
            <b-row align-h="center">
                <b-col sm="12" md="6">
                    <b-card header="PayFair Platform Infographs"
                            align="left">
                            <b-row>
                                <b-col sm="12" md="6">
                                    <b>8wk transaction volume</b>
                                    <bar-chart :chart-data="datacollection_8wk_tr"></bar-chart>
                                </b-col>
                                <b-col sm="12" md="6">
                                    <b>All time transaction volume</b>
                                    <template v-if="all_tr === 91">
                                        <line-chart :chart-data="datacollection_all_tr91"></line-chart>
                                    </template>
                                    <template v-else>
                                        <line-chart :chart-data="datacollection_all_tr7"></line-chart>
                                    </template>
                                    <b-button v-on:click="changeAverageTr">Change average</b-button>
                                </b-col>
                            </b-row>
                            <b-row>
                                <b-col sm="12" md="6">
                                    <b>8wk USD volume</b>
                                    <bar-chart :chart-data="datacollection_8wk_usd"></bar-chart>
                                </b-col>
                                <b-col sm="12" md="6">
                                    <b>All time USD volume</b>
                                    <template v-if="all_usd === 91">
                                        <line-chart :chart-data="datacollection_all_usd91"></line-chart>
                                    </template>
                                    <template v-else>
                                        <line-chart :chart-data="datacollection_all_usd7"></line-chart>
                                    </template>
                                    <b-button v-on:click="changeAverageUSD">Change average</b-button>
                                </b-col>
                            </b-row>
                    </b-card>
                </b-col>
                <b-col sm="12" md="6">
                    <b-card header="PayFair 24 Hour Transactions"
                            align="left">
                            <b-table striped hover
                                    :items="hr24"
                                    :fields="fields"
                            >
                                <template slot="coin" slot-scope="row">{{row.value}}</template>
                                <template slot="sum" slot-scope="row">{{row.value.toFixed(6)}}</template>
                                <template slot="volume" slot-scope="row">{{row.value.toFixed(6)}}</template>
                            </b-table>
                    </b-card>
                </b-col>
            </b-row>
        </div>
    </div>
</template>
<script>
import { Line, Bar } from 'vue-chartjs/src/BaseCharts'
import LineChart from './LineChart.js'
import BarChart from './BarChart.js'
export default {
    name: 'TransactionsList',
    components: {
        LineChart,
        BarChart,
    },
    data: function () {
        return {
            all_tr: 91,
            all_usd: 91,
            datacollection_all_tr91: null,
            datacollection_all_tr7: null,
            datacollection_all_usd91: null,
            datacollection_all_usd7: null,
            datacollection_8wk_tr: null,
            datacollection_8wk_usd: null,
            hr24: [],
            all: [],
            fields: {
                coin: {label: 'Currency'},
                sum: {label: 'Transactions'},
                volume: {label: 'Volume (USD)'},
            },
        }
    },
    created: function () {
        this.getDeals();
    },
    methods: {
        changeAverageTr: function () {
            if (this.all_tr === 91) {
                this.all_tr = 7;
            } else {
                this.all_tr = 91;
            }
        },
        changeAverageUSD: function () {
            if (this.all_usd === 91) {
                this.all_usd = 7;
            } else {
                this.all_usd = 91;
            }
        },
        getDeals: function () {
            let promise = this.$http.get(`/deals/stats`);
            return promise.then(response => {
                this.hr24 = response.data.hr24;
                this.all = response.data.all;
                console.log();
                this.datacollection_all_tr91 = {
                    labels: [],
                    datasets: [
                        {
                            label: '91 day average',
                            backgroundColor: '#ff000000',
                            borderColor: '#ff0000',
                            data: []
                        },
                    ]
                };
                this.datacollection_all_tr7 = {
                    labels: [],
                    datasets: [
                        {
                            label: '7 day average',
                            backgroundColor: '#ff000000',
                            borderColor: '#ff000030',
                            data: []
                        },
                    ]
                };
                this.datacollection_8wk_tr = {
                    labels: [],
                    datasets: [
                        {
                            label: 'Data',
                            backgroundColor: '#ff000070',
                            data: []
                        }
                    ]
                };
                this.datacollection_all_usd91 = {
                    labels: [],
                    datasets: [
                        {
                            label: '91 day average',
                            backgroundColor: '#0000ff00',
                            borderColor: '#0000ff',
                            data: []
                        },
                    ]
                };
                this.datacollection_all_usd7 = {
                    labels: [],
                    datasets: [
                        {
                            label: '7 day average',
                            backgroundColor: '#0000ff00',
                            borderColor: '#0000ff30',
                            data: []
                        },
                    ]
                };
                this.datacollection_8wk_usd = {
                    labels: [],
                    datasets: [
                        {
                            label: 'Data',
                            backgroundColor: '#0000ff70',
                            data: []
                        }
                    ]
                };

                var iter = 1, tr = 0, volume = 0;
                for (var vol of this.all) {
                    if (iter % 8 === 0) {
                        this.datacollection_all_tr7.labels.push('');
                        this.datacollection_all_tr7.datasets[0].data.push(tr / 7);
                        this.datacollection_all_usd7.labels.push('');
                        this.datacollection_all_usd7.datasets[0].data.push(volume / 7);
                        tr = vol.sum;
                        volume = vol.volume;
                        iter++;
                    } else {
                        tr += vol.sum;
                        volume += vol.volume;
                        iter++;
                    }
                }
                iter = 1;
                tr = 0;
                volume = 0;
                for (var vol of this.all) {
                    if (iter % 92 === 0) {
                        this.datacollection_all_tr91.labels.push('');
                        this.datacollection_all_tr91.datasets[0].data.push(tr / 91);
                        this.datacollection_all_usd91.labels.push('');
                        this.datacollection_all_usd91.datasets[0].data.push(volume / 91);
                        tr = vol.sum;
                        volume = vol.volume;
                        iter++;
                    } else {
                        tr += vol.sum;
                        volume += vol.volume;
                        iter++;
                    }
                }
                for (var i = 0; i < Math.min(7 * 8, this.all.length); ++i) {
                    this.datacollection_8wk_tr.labels.push('');
                    this.datacollection_8wk_tr.datasets[0].data.push(this.all[i].sum);

                    this.datacollection_8wk_usd.labels.push('');
                    this.datacollection_8wk_usd.datasets[0].data.push(this.all[i].volume);
                }
                
                return [];
            }).catch(error => {
                return [];
            });
        },
    },
};
</script>
<style>

</style>