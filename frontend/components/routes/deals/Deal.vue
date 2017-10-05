<template>
    <div class="deal-window">
        {{id}}
        <b-row>
            <b-col md="3">
                You: {{$auth.user().username}}<br>
                <img :src="$auth.user().profileImg">
            </b-col>
            <b-col md="6">
                <div class="chat-frame">
                    <ul class="chat" ref="messages-box">
                        <li v-for="message in messages">
                            <div :class="message.sender._id == $auth.user()._id ? 'msj macro' : 'msj-rta macro'">
                                <div :class="message.sender.id == $auth.user()._id ? 'text text-l' : 'text text-r'">
                                    <p class="msg-sender">{{message.sender.username}}</p>
                                    <p class="msg-text">{{message.text}}</p>
                                    <p class="msg-time">
                                        <small v-if="isToday(message.created_at)">Today, {{message.created_at | moment("HH:mm:ss")}}</small>
                                        <small v-if="!isToday(message.created_at)">{{message.created_at | moment("MMMM Do YYYY, HH:mm:ss")}}</small>
                                    </p>
                                </div>
                            </div>
                        </li>
                    </ul>
                    <b-form @submit="onSubmit" class="message-form">
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
                Counterparty: {{counterparty.username}}<br>
                <img :src="counterparty.profileImg">
            </b-col>
        </b-row>

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
                form: {
                    text: ''
                }
            }
        },
        sockets: {
            initMessages: function (data) {
                for (let i = 0; i < data.messages.length; i++) {
                    this.messages.push(data.messages[i]);
                }
                this.counterparty = data.counterparty;
                if (!this.counterparty.profileImg) {
                    this.counterparty.profileImg = 'http://localhost:3000/images/default-user-img.png';
                } else {
                    this.counterparty.profileImg = 'http://localhost:3000/profile-pic/'+this.counterparty.profileImg;
                }

                let vm = this;
                vm.$nextTick(function () {vm.$refs['messages-box'].scrollTop = this.$refs['messages-box'].scrollHeight;});
            },
            message: function (data) {
                this.messages.push(data);
                let vm = this;
                vm.$nextTick(function () {vm.$refs['messages-box'].scrollTop = this.$refs['messages-box'].scrollHeight;});
            }
        },
        methods: {
            onSubmit: function (e) {
                e.preventDefault();
                let data = {
                    deal_id: this.id,
                    text: this.form.text,
                };
                this.form.text = '';
                this.$socket.emit('message', data);
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

    /* chat box end*/
</style>