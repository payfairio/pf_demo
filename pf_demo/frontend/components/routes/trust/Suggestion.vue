<template>
    <div class="suggestion-window">
        <h2>{{row}}</h2>
    </div>
</template>
<script>
    export default {
        name: 'Suggestion',
        props: ['id'],
        created: function () {
        },
        beforeDestroy: function () {
        },
        data: function () {
            return {
                suggestion
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
            openUploadDialog: function () {
                this.$refs['file-input'].click();
            },
            fileChosen: function (e) {
                  /*e.target.files[0];
                FReader = new FileReader();*/
            },
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