<template>
    <div class="deal-window">
        <h1>{{deal.name}}</h1>
        <div class="deal-info">
            Status: {{deal.status}} <br>
            Sum: <b>{{deal.sum}}ETH</b> <button class="btn btn-sm btn-primary" v-if="deal.status === 'new'" @click="changeSumClick">change</button>
        </div>
        <hr>
        <b-row>
            <b-col md="3">
                <div class="profile-card">
                    You: {{$auth.user().username}}<br>
                    Role: {{myRole}}<br>
                    <img :src="$auth.user().profileImg">
                </div>
                <hr>
                <div class="deal-actions">
                    <div class="form-group"><button @click="openConditions('seller')" class="btn btn-default">Seller conditions</button> <button v-if="deal.seller && deal.seller._id === $auth.user()._id && deal.status === 'new'" class="btn btn-primary" @click="openConditions('seller');changeConditionsClick();">change</button></div>
                    <div class="form-group"><button @click="openConditions('buyer')" class="btn btn-default">Buyer conditions</button> <button v-if="deal.buyer && deal.buyer._id === $auth.user()._id && deal.status === 'new'" class="btn btn-primary" @click="openConditions('buyer');changeConditionsClick();">change</button></div>

                    <div class="form-group" v-if="deal.status === 'new'">
                        <button v-if="!conditionsAcceptedByMe" class="btn btn-success" @click="acceptConditionsAndSum">Accept conditions and sum</button>
                        <p v-if="conditionsAcceptedByMe">You are already accepted conditions and sum. If your counterparty change them then you will have to accept them again for deal start.</p>
                    </div>

                    <div class="form-group" v-if="deal.status === 'accepted'">
                        <button v-if="myRole === 'buyer'" class="btn btn-success" @click="acceptDeal">Accept deal</button>
                        <button class="btn btn-danger" @click="openDispute">Call escrow</button>
                    </div>

                    <div class="form-group" v-if="deal.status === 'completed'">
                        <p>Deal was complete. Money was transferred.</p>
                    </div>

                    <div class="form-group" v-if="deal.status === 'dispute'">
                        <p>Deal is being verified by escrows. Please wait.</p>
                        <hr>
                        <ul>
                            <li v-for="(decision, index) in deal.escrows">escrow {{index + 1}}: {{decision.decision ? decision.decision : 'pending'}}</li>
                        </ul>
                    </div>
                </div>
            </b-col>
            <b-col md="6">
                <div class="chat-frame">
                    <ul class="chat" ref="messages-box">
                        <li v-for="message in messages">
                            <div v-if="message.type === 'message'" :class="message.sender._id == $auth.user()._id ? 'msj macro' : 'msj-rta macro'">
                                <div :class="message.sender._id == $auth.user()._id ? 'text text-l' : 'text text-r'">
                                    <p class="msg-sender">{{message.sender._id == $auth.user()._id ? 'You' : message.sender.username}}</p>
                                    <p class="msg-text">{{message.text}}</p>
                                    <p class="msg-time">
                                        <small v-if="isToday(message.created_at)">Today, {{message.created_at | moment("HH:mm:ss")}}</small>
                                        <small v-if="!isToday(message.created_at)">{{message.created_at | moment("MMMM Do YYYY, HH:mm:ss")}}</small>
                                    </p>
                                </div>
                            </div>
                            <div v-if="message.type === 'system'">
                                <div :class="'system-msg'">
                                    <p class="sys-msg-sender">{{message.sender ? (message.sender._id == $auth.user()._id ? 'You' : message.sender.username) : 'PayFair System'}}</p>
                                    <p class="sys-msg-text">{{message.text}}</p>
                                    <p class="sys-msg-time">
                                        <small v-if="isToday(message.created_at)">Today, {{message.created_at | moment("HH:mm:ss")}}</small>
                                        <small v-if="!isToday(message.created_at)">{{message.created_at | moment("MMMM Do YYYY, HH:mm:ss")}}</small>
                                    </p>
                                </div>
                            </div>
                        </li>
                    </ul>
                    <b-form @submit="onSubmit" class="message-form" v-if="deal.status !== 'completed'">
                        <b-input-group>
                            <b-form-textarea id="message-text" @keydown.native="inputHandler" v-model="form.text" :max-rows="1" style="resize: none;"></b-form-textarea>
                            <b-input-group-button>
                                <b-button type="submit" variant="primary">Send</b-button>
                            </b-input-group-button>
                        </b-input-group>
                    </b-form>
                </div>
            </b-col>
            <b-col md="3">
                <div class="profile-card">
                    Counterparty: {{counterparty.username ? counterparty.username : counterparty.email}}<br>
                    Role: {{counterPartyRole}}<br>
                    <img :src="counterparty.profileImg">
                </div>
            </b-col>
        </b-row>

        <!-- Modal Conditions Component -->
        <b-modal v-model="conditionsModal" :title="activeCondition.role+' conditions'" @hide="cancelConditionsChange">
            <p v-if="conditionsEdition === false" class="">{{activeCondition.text}}</p>
            <div v-if="conditionsEdition === true" class="">
                <b-form-textarea v-model="activeCondition.editedText" :rows="9"></b-form-textarea>
            </div>
            <div slot="modal-footer" class="w-100">
                <b-btn v-if="activeCondition.role && !conditionsEdition && deal[activeCondition.role.toLowerCase()] && deal[activeCondition.role.toLowerCase()]._id === $auth.user()._id" size="sm" @click="changeConditionsClick" class="float-right" variant="primary">Change</b-btn>

                <b-btn v-if="conditionsEdition" size="sm" class="float-right" @click="submitConditions" variant="success">Save</b-btn>
                <b-btn v-if="conditionsEdition" size="sm" class="float-right" @click="cancelConditionsChange">Cancel</b-btn>
            </div>
        </b-modal>

        <!-- Modal Sum Component -->
        <b-modal v-model="sumModal" :title="'Deal sum'">
            <p>Current sum: {{deal.sum}}ETH</p>
            <b-form-input type="number" v-model="editedSum"></b-form-input>
            <div slot="modal-footer" class="w-100">
                <b-btn size="sm" class="float-right" @click="submitSum" variant="success">Save</b-btn>
                <b-btn size="sm" class="float-right" @click="sumModal = false">Cancel</b-btn>
            </div>
        </b-modal>
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
                this.messages = [];
                for (let i = 0; i < data.messages.length; i++) {
                    this.messages.push(data.messages[i]);
                }
                this.counterparty = data.counterparty;
                this.deal = data.deal;
                if (!this.counterparty.profileImg) {
                    this.counterparty.profileImg = this.$config.backendUrl+'/images/default-user-img.png';
                } else {
                    this.counterparty.profileImg = this.$config.backendUrl+'/profile-pic/'+this.counterparty.profileImg;
                }

                let vm = this;
                vm.$nextTick(function () {vm.$refs['messages-box'].scrollTop = this.$refs['messages-box'].scrollHeight;});
            },
            message: function (data) {
                this.messages.push(data);
                let vm = this;
                vm.$nextTick(function () {vm.$refs['messages-box'].scrollTop = this.$refs['messages-box'].scrollHeight;});
            },
            changeDealConditions: function (data) {
                // reset data
                this.$socket.emit('leave_chat', {deal_id: this.id});
                this.$socket.emit('join_chat', {deal_id: this.id});
            },
            changeDealSum: function (data) {
                // reset data
                this.$socket.emit('leave_chat', {deal_id: this.id});
                this.$socket.emit('join_chat', {deal_id: this.id});
            },
            dealConditionsAccepted: function (data) {
                // reset data
                this.$socket.emit('leave_chat', {deal_id: this.id});
                this.$socket.emit('join_chat', {deal_id: this.id});
            },
            disputeOpened: function (data) {
                // reset data
                this.$socket.emit('leave_chat', {deal_id: this.id});
                this.$socket.emit('join_chat', {deal_id: this.id});
            },
            dealCompleted: function (data) {
                // reset data
                this.$socket.emit('leave_chat', {deal_id: this.id});
                this.$socket.emit('join_chat', {deal_id: this.id});
            },
            disputeChanged: function (data) {
                // reset data
                this.$socket.emit('leave_chat', {deal_id: this.id});
                this.$socket.emit('join_chat', {deal_id: this.id});
            }
        },
        computed: {
            conditionsAcceptedByMe: function () {
                if (!this.deal.seller || !this.deal.buyer) {
                    return false;
                }
                if (this.deal.seller._id === this.$auth.user()._id) {
                    return this.deal.acceptedBySeller;
                }
                if (this.deal.buyer._id === this.$auth.user()._id) {
                    return this.deal.acceptedByBuyer;
                }
                return false;
            },
            myRole: function () {
                if (!this.deal.seller || !this.deal.buyer) {
                    return '';
                }
                if (this.deal.seller._id === this.$auth.user()._id) {
                    return 'seller';
                }
                if (this.deal.buyer._id === this.$auth.user()._id) {
                    return 'buyer';
                }
                return '';
            },
            counterPartyRole: function () {
                if (!this.deal.seller || !this.deal.buyer) {
                    return '';
                }
                if (this.deal.seller._id === this.$auth.user()._id) {
                    return 'buyer';
                }
                if (this.deal.buyer._id === this.$auth.user()._id) {
                    return 'seller';
                }
                return '';
            }
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
            changeConditionsClick: function () {
                this.activeCondition.editedText = this.activeCondition.text;
                this.conditionsEdition = true;
            },
            cancelConditionsChange: function () {
                this.activeCondition.editedText = this.activeCondition.text;
                this.conditionsEdition = false;
            },
            submitConditions: function () {
                const vm = this;
                if (confirm('Are you sure that you want to change deal conditions')) {
                    let data = {
                        deal_id: vm.id,
                        conditions: vm.activeCondition.editedText
                    };
                    vm.$socket.emit('set_deal_condition', data);
                    vm.conditionsModal = false;
                    vm.$swal('Success', 'Deal conditions changed. But it must be accepted by your counterparty', 'success');
                }
            },
            acceptConditionsAndSum: function () {
                const vm = this;
                if (confirm('Are you sure that you want to accept deal sum and conditions')) {
                    let data = {
                        deal_id: vm.id,
                    };
                    vm.$socket.emit('accept_deal_condition', data);
                    vm.$swal('Success', 'You accepted deal condition and sum. But it must be accepted by your counterparty too', 'success');
                }
            },
            changeSumClick: function () {
                this.sumModal = true;
                this.editedSum = this.deal.sum;
            },
            submitSum: function () {
                const vm = this;
                if (confirm('Are you sure that you want to change deal sum')) {
                    let data = {
                        deal_id: vm.id,
                        sum: vm.editedSum
                    };
                    vm.$socket.emit('set_deal_sum', data);
                    vm.sumModal = false;
                    vm.$swal('Success', 'Deal sum changed. But it must be accepted by your counterparty', 'success');
                }
            },
            //
            acceptDeal: function () {
                const vm = this;
                if (confirm('Are you sure that you want to accept deal and release sum from smartcontract to your counterparty?')) {
                    let data = {
                        deal_id: vm.id,
                    };
                    vm.$socket.emit('accept_deal', data);
                    vm.$swal('Success', 'Deal complete. Sum released from smartcontract', 'success');
                }
            },
            openDispute: function () {
                const vm = this;
                if (confirm('Are you sure that you want to call escrow and start dispute?')) {
                    let data = {
                        deal_id: vm.id,
                    };
                    vm.$socket.emit('call_escrow', data);
                    vm.$swal('Success', 'Dispute opened. Wait for escrows decision', 'success');
                }
            },
            // chat
            onSubmit: function (e) {
                e.preventDefault();
                if (this.form.text.trim()) {
                    let data = {
                        deal_id: this.id,
                        text: this.form.text.trim(),
                    };
                    this.form.text = '';
                    this.$socket.emit('message', data);
                }
            },
            inputHandler(e) {
                if (e.keyCode === 13 && !e.shiftKey && !e.ctrlKey) {
                    this.onSubmit(e);
                }
                if (e.keyCode === 13 && e.ctrlKey) {
                    this.form.text += "\n";
                }
            },
            isToday(date) {
                date = new Date(date);
                return new Date().toLocaleDateString() === date.toLocaleDateString();
            }
        },
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