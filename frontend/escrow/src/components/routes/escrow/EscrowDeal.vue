<template>
    <div class="container">
        <div class="deal-window">
            <h1>{{deal.name}}</h1>
            <div class="deal-info">
                Status: {{deal.status}} <br>
                Sum: <b>{{deal.sum}}ETH</b>
            </div>
            <hr>
            <b-row>
                <b-col md="3">
                    <div class="profile-card" v-if="deal.seller">
                        Seller: <router-link :to="{name: 'user-by-id', params: {id: deal.seller._id}}">{{deal.seller.username}}</router-link><br>
                        <!--Seller: {{deal.seller.username}}<br>-->
                        <img :src="deal.seller.profileImg">
                    </div>
                    <hr>
                    <div class="deal-actions">
                        <div class="form-group"><button @click="openConditions('seller')" class="btn btn-default">Seller conditions</button></div>
                        <div class="form-group"><button @click="openConditions('buyer')" class="btn btn-default">Buyer conditions</button></div>

                        <div class="form-group" v-if="deal.status === 'completed'">
                            <p>Deal was complete. Money was transferred.</p>
                            <div>
                                Your decision: {{deal.decision}}
                            </div>
                        </div>

                        <div class="form-group" v-if="deal.status === 'dispute'">
                            <p>Deal is being verified by escrows.</p>
                            <div v-if="deal.decision === 'pending'">
                                <p>Choose who are right</p>
                                <div class="form-group">
                                    <button class="btn btn-primary" @click="sendDecision('seller')">Seller's side</button>
                                    <button class="btn btn-primary" @click="sendDecision('buyer')">Buyer's side</button>
                                </div>
                                <div><button class="btn btn-danger" @click="sendDecision('rejected')">Reject (skip)</button></div>
                            </div>
                            <div v-if="deal.decision !== 'pending'">
                                Your decision: {{deal.decision}}
                            </div>
                        </div>
                    </div>
                </b-col>
                <b-col md="6">
                    <div class="chat-frame">
                        <ul class="chat" ref="messages-box">
                            <li v-for="message in messages">
                                <div v-if="message.type === 'message'" :class="message.sender._id == deal.seller._id ? 'msj macro' : 'msj-rta macro'">
                                    <div :class="message.sender._id == deal.seller._id ? 'text text-l' : 'text text-r'">
                                        <p class="msg-sender">{{message.sender.username}}</p>
                                        <p class="msg-text">{{message.text}}</p>
                                        <p class="msg-time">
                                            <small v-if="isToday(message.created_at)">Today, {{message.created_at | moment("HH:mm:ss")}}</small>
                                            <small v-if="!isToday(message.created_at)">{{message.created_at | moment("MMMM Do YYYY, HH:mm:ss")}}</small>
                                        </p>
                                    </div>
                                </div>
                                <div v-if="message.type === 'system'">
                                    <div :class="'system-msg'">
                                        <p class="sys-msg-sender">{{message.sender ? message.sender.username : 'PayFair System'}}</p>
                                        <p class="sys-msg-text">{{message.text}}</p>
                                        <p class="sys-msg-time">
                                            <small v-if="isToday(message.created_at)">Today, {{message.created_at | moment("HH:mm:ss")}}</small>
                                            <small v-if="!isToday(message.created_at)">{{message.created_at | moment("MMMM Do YYYY, HH:mm:ss")}}</small>
                                        </p>
                                    </div>
                                </div>
                            </li>
                        </ul>
                    </div>
                </b-col>
                <b-col md="3">
                    <div class="profile-card" v-if="deal.buyer">
                        Buyer: <router-link :to="{name: 'user-by-id', params: {id: deal.buyer._id}}">{{deal.buyer.username}}</router-link><br>
                        <!--Buyer: {{deal.buyer.username}}<br>-->
                        <img :src="deal.buyer.profileImg">
                    </div>
                </b-col>
            </b-row>

            <!-- Modal Conditions Component -->
            <b-modal v-model="conditionsModal" :title="activeCondition.role+' conditions'">
                <p>{{activeCondition.text}}</p>

                <div slot="modal-footer" class="w-100">
                </div>
            </b-modal>
        </div>
    </div>
</template>
<script>
    export default {
        name: 'Deal',
        props: ['id'],
        created: function () {
            this.$socket.emit('join_chat', {deal_id: this.id});
        },
        beforeDestroy: function () {
            this.$socket.emit('leave_chat', {deal_id: this.id});
        },
        data: function () {
            return {
                messages: [],
                counterparty: {
                    username: '',
                    profileImg: ''
                },
                deal: {
                    name: '',
                    sum: '',
                    status: '', // статус сделки, новая, подтверждены условия/в процессе, завершенная, спорная
                    acceptedBySeller: false,
                    acceptedByBuyer: false,
                    seller: null,
                    buyer: null,
                },
                form: {
                    text: ''
                },
                sumModal: false,
                conditionsModal: false,
                activeCondition: {
                    role: '',
                    text: '',
                    editedText: ''
                },
                editedSum: 0,
                conditionsEdition: false,
            }
        },
        sockets: {
            initMessages: function (data) {
                for (let i = 0; i < data.messages.length; i++) {
                    this.messages.push(data.messages[i]);
                }
                this.deal = data.deal;
                if (!this.deal.seller.profileImg) {
                    this.deal.seller.profileImg = this.$config.staticUrl+'/images/default-user-img.png';
                } else {
                    this.deal.seller.profileImg = this.$config.staticUrl+'/profile-pic/'+this.deal.seller.profileImg;
                }

                if (!this.deal.buyer.profileImg) {
                    this.deal.buyer.profileImg = this.$config.staticUrl+'/images/default-user-img.png';
                } else {
                    this.deal.buyer.profileImg = this.$config.staticUrl+'/profile-pic/'+this.deal.buyer.profileImg;
                }

                let vm = this;
                vm.$nextTick(function () {vm.$refs['messages-box'].scrollTop = this.$refs['messages-box'].scrollHeight;});
            },
            message: function (data) {
                this.messages.push(data);
                let vm = this;
                vm.$nextTick(function () {vm.$refs['messages-box'].scrollTop = this.$refs['messages-box'].scrollHeight;});
            },
            disputeChanged: function (data) {
                // reset data
                this.$socket.emit('leave_chat', {deal_id: this.id});
                this.$socket.emit('join_chat', {deal_id: this.id});
            }
        },
        computed: {

        },
        methods: {
            openConditions: function (role) {
                this.conditionsModal = true;
                switch (role) {
                    case 'seller':
                        this.activeCondition.role = 'Seller';
                        this.activeCondition.text = this.deal.sellerConditions;
                        break;
                    case 'buyer':
                        this.activeCondition.role = 'Buyer';
                        this.activeCondition.text = this.deal.buyerConditions;
                        break;
                }
            },

            sendDecision: function (decision) {
                const vm = this;
                if (confirm('Are you sure of your decision? This action cannot be undone')) {
                    let data = {
                        deal_id: vm.id,
                        decision: decision
                    };
                    vm.$socket.emit('choose_dispute_side', data);
                    vm.$swal('Success', 'Your decision was made', 'success');
                }
            },

            isToday(date) {
                date = new Date(date);
                return new Date().toLocaleDateString() === date.toLocaleDateString();
            }
        },
        watch: {
            id: function (val, oldVal) {
                // reset data
                this.$socket.emit('leave_chat', {deal_id: oldVal});
                this.$socket.emit('join_chat', {deal_id: val});
            }
        }
    }
</script>
<style scoped>

    /* chat box start*/
    .chat-frame {
        background:#e0e0de;
        height: 450px;
        overflow:hidden;
        padding:0;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
    }
    .message-form {
        width: 100%;
    }
    ul.chat {
        width:100%;
        list-style-type: none;
        padding:18px;
        margin: 0;
        display:flex;
        flex-direction: column;
        overflow-y: auto;
    }
    ul.chat li {
        width: 100%;
    }
    .text{
        width:100%;display:flex;flex-direction:column;
    }
    .text > p.msg-sender {
        width:100%;margin-top:0;margin-bottom:auto;line-height: 13px;font-size: 12px; font-weight: bold;
    }
    .text > p.msg-text{
        width:100%;margin-top:10px;margin-bottom:auto;line-height: 13px;font-size: 12px;
        padding-right: 25%;
        white-space: pre-wrap;
    }
    .text > p.msg-time{
        width:100%;text-align:right;color:silver;margin-bottom:-7px;margin-top:auto;
    }
    .text-l{
        float:left;padding-right:10px;
    }
    .text-r{
        float:right;padding-left:10px;
    }
    .avatar{
        display:flex;
        justify-content:center;
        align-items:center;
        width:25%;
        float:left;
        padding-right:10px;
    }
    .macro{
        margin-top:5px;width:85%;border-radius:5px;padding:5px;display:flex;
    }
    .msj-rta{
        float:right;background:whitesmoke;
    }
    .msj{
        float:left;background:white;
    }
    .msj:before{
        width: 0;
        height: 0;
        content:"";
        top:-5px;
        left:-14px;
        position:relative;
        border-style: solid;
        border-width: 0 13px 13px 0;
        border-color: transparent #ffffff transparent transparent;
    }
    .msj-rta:after{
        width: 0;
        height: 0;
        content:"";
        top:-5px;
        left:14px;
        position:relative;
        border-style: solid;
        border-width: 13px 13px 0 0;
        border-color: whitesmoke transparent transparent transparent;
    }
    /* system messages */
    .system-msg {
        text-align: center;
    }
    .sys-msg-sender {
        font-weight: bold;
        margin-bottom: 0.1em;
        margin-top: 1em;
    }
    .sys-msg-text {
        margin-bottom: 0.05em;
    }
    /* chat box end*/

    .deal-actions {
        text-align: center;
    }
</style>