import { Bar, mixins } from 'vue-chartjs'
const { reactiveProp } = mixins

export default {
    extends: Bar,
    mixins: [reactiveProp],
    mounted () {
        this.renderChart(this.chartData, {responsive: true, maintainAspectRatio: false})
    }
}