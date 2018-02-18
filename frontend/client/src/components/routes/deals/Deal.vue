<template>
    <div class="deal-window">
        <div class="container">
            <h1>{{deal.name}}</h1>
            <div class="deal-info">
                Status: {{deal.status}} <br>
                Sum: <b>{{deal.sum}}{{deal.coin.toUpperCase()}}</b> <button class="btn btn-sm btn-primary" v-if="deal.status === 'new'" @click="changeSumClick">change</button>
            </div>
            <hr>
            <b-row>
                <b-col md="3">
                    <div class="profile-card">
                        You: {{$auth.user().username}}<br>
                        Role: {{myRole}}<br>
                        <img :src="$auth.user().profileImg">
                        <!-- <div class="rating">
                            <span v-for="i in 5">
                                <div class="fill" :style="'width:' + (Math.floor(parseFloat($auth.user().rating.value)) > i ? 100 : (Math.floor(parseFloat($auth.user().rating.value)) == i ? (parseFloat($auth.user().rating.value) % i).toFixed(2) * 100 : 0)) + '%'"></div>
                            </span>
                        </div> -->
                    </div>
                    <hr>
                    <div class="deal-actions">
                        <div class="form-group" v-if="deal.status === 'new'">
                            <button v-if="!conditionsAcceptedByMe" class="btn btn-success" @click="acceptConditionsAndSum">Accept conditions and sum</button>
                            <p v-if="conditionsAcceptedByMe">You have already accepted the conditions and sum. If your counterparty changes them, you will have to accept them again for the deal to start.</p>
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
                        <div class="messages-box" ref="messages-box">
                            <ul class="chat">
                                <li v-for="message in messages">
                                    <div v-if="message.type === 'message'" :class="message.sender._id == $auth.user()._id ? 'msj macro' : 'msj-rta macro'">
                                        <div :class="message.sender._id == $auth.user()._id ? 'text text-l' : 'text text-r'">
                                            <p class="msg-sender">{{message.sender._id == $auth.user()._id ? 'You' : message.sender.username}}</p>
                                            <p class="msg-text">{{message.text}}</p>
                                            <div v-for="attachment in message.attachments" v-if="isType(attachment.name) === 'png' || isType(attachment.name) === 'jpeg' || isType(attachment.name) === 'gif' || isType(attachment.name) === 'bmp'"><img class="img-deal" :src="$config.backendUrl+'/attachments/'+attachment._id"></div>
                                            <div v-for="attachment in message.attachments"><a target="_blank" :href="$config.backendUrl+'/attachments/'+attachment._id">{{attachment.name}}</a></div>
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
                        </div>
                        <b-form @submit="onSubmit" class="message-form" v-if="deal.status !== 'completed'">
                            <b-input-group>
                                <b-form-textarea id="message-text" @keydown.native="inputHandler" v-model="form.text" :max-rows="1" style="resize: none;"></b-form-textarea>
                                <b-input-group-button>
                                    <b-button @click="openUploadDialog"><svg style="width:24px;height:24px" viewBox="0 0 24 24">
                                        <path fill="#ffffff" d="M16.5,6V17.5A4,4 0 0,1 12.5,21.5A4,4 0 0,1 8.5,17.5V5A2.5,2.5 0 0,1 11,2.5A2.5,2.5 0 0,1 13.5,5V15.5A1,1 0 0,1 12.5,16.5A1,1 0 0,1 11.5,15.5V6H10V15.5A2.5,2.5 0 0,0 12.5,18A2.5,2.5 0 0,0 15,15.5V5A4,4 0 0,0 11,1A4,4 0 0,0 7,5V17.5A5.5,5.5 0 0,0 12.5,23A5.5,5.5 0 0,0 18,17.5V6H16.5Z" />
                                    </svg></b-button>
                                    <input @change="fileChosen" type="file" id="attachment" multiple style="display: none" ref="file-input">
                                    <b-button type="submit" variant="primary">Send</b-button>
                                </b-input-group-button>
                            </b-input-group>
                            <div class="attach-box">
                                <ul class="attachments-items">
                                    <li v-for="file, index in attachments">{{index}}.{{file.name}} - {{file.progress}}% <span v-on:click="removeFile(index)">[x]</span></li>
                                </ul>
                            </div>
                        </b-form>
                    </div>
                </b-col>
                <b-col md="3">
                    <div class="profile-card">
                        Counterparty: <router-link v-if="counterparty._id" :to="{name: 'user-by-id', params: {id: counterparty._id}}">{{counterparty.username ? counterparty.username : counterparty.email}}</router-link><br>
                        Role: {{counterPartyRole}}<br>
                        <img :src="counterparty.profileImg">
                        <!-- <div class="rating">
                            <span v-for="i in 5">
                                <div class="fill" :style="'width:' + (Math.floor(parseFloat(counterparty.rating.value)) > i ? 100 : (Math.floor(parseFloat(counterparty.rating.value)) == i ? (Math.floor(parseFloat(counterparty.rating.value)) % i).toFixed(2) * 100 : 0)) + '%'"></div>
                            </span>
                        </div> -->
                    </div>
                </b-col>
            </b-row>
            <hr>
            <b-row class="buy-sel-conditions">
                <b-col md="6">
                    <div class="" v-if="deal.seller && deal.seller._id === $auth.user()._id && conditionsEdition === false">
                        <h4>Seller conditions</h4>
                        <p>{{deal.sellerConditions}}</p>
                        <button v-if="deal.status === 'new' && conditionsEdition === false" class="btn btn-primary" @click="openConditions('seller');changeConditionsClick();">change</button>
                    </div>
                    <div class="" v-if="deal.buyer && deal.buyer._id === $auth.user()._id && conditionsEdition === false">
                        <h4>Buyer conditions</h4>
                        <p>{{deal.buyerConditions}}</p>
                        <button v-if="deal.status === 'new' && conditionsEdition === false" class="btn btn-primary" @click="openConditions('buyer');changeConditionsClick();">change</button>
                    </div>
                    <div class="" v-if="((deal.seller && deal.seller._id === $auth.user()._id) || (deal.buyer && deal.buyer._id === $auth.user()._id)) && deal.status === 'new' && conditionsEdition === true">
                        <h4>{{activeCondition.role}} conditions</h4>
                        <b-form-textarea class="form-modal-conditions" v-model="activeCondition.editedText" :rows="9"></b-form-textarea>
                        <div slot="modal-footer" class="w-100">
                            <b-btn v-if="conditionsEdition" size="sm" class="float-right" @click="submitConditions" variant="success">Save</b-btn>
                            <b-btn v-if="conditionsEdition" size="sm" class="float-right" @click="cancelConditionsChange">Cancel</b-btn>
                        </div>
                    </div>
                </b-col>
                <b-col md="6">
                    <div class="" v-if="deal.seller && deal.seller._id === $auth.user()._id">
                        <h4>Buyer conditions</h4>
                        <p>{{deal.buyerConditions}}</p>
                    </div>
                    <div class="" v-if="deal.buyer && deal.buyer._id === $auth.user()._id">
                        <h4>Seller conditions</h4>
                       <p>{{deal.sellerConditions}}</p>
                    </div>
                </b-col>
            </b-row>
        </div>
        <b-modal v-model="reviewModal" title="Comment your counterparty!" @hide="cancelReview">
            <b-form-group label="Rate: " label-for="rating" :state="isValid('rating')" :feedback="errorMessage('rating')">
                <div class="rating">
                    <input type="radio" :id="'r_5'" v-model="review.rating" :value="5">
                    <label :for="'r_5'"></label>
                    <input type="radio" :id="'r_4'" v-model="review.rating" :value="4">
                    <label :for="'r_4'"></label>
                    <input type="radio" :id="'r_3'" v-model="review.rating" :value="3">
                    <label :for="'r_3'"></label>
                    <input type="radio" :id="'r_2'" v-model="review.rating" :value="2">
                    <label :for="'r_2'"></label>
                    <input type="radio" :id="'r_1'" v-model="review.rating" :value="1">
                    <label :for="'r_1'"></label>                
                    <span :state="isValid('rating')">{{review.rating}}</span>
                </div>
            </b-form-group>
            <b-form-group id="commentInputGroup" label="Your comment:" label-for="comment" :state="isValid('comment')" :feedback="errorMessage('comment')">
                <b-form-textarea id="comment" v-model="review.comment" :rows="6" :state="isValid('comment')"></b-form-textarea>
            </b-form-group>

            <div slot="modal-footer" class="w-100">
                <b-btn size="sm" class="float-right" @click="submitReview" variant="success">Save</b-btn>
                <b-btn size="sm" class="float-right" @click="cancelReview">Cancel</b-btn>
            </div>
        </b-modal>
        
        <!-- Modal Sum Component -->
        <b-modal v-model="sumModal" :title="'Deal sum'">
            <p>Current sum: {{deal.sum}}ETH</p>
            <b-form-input type="number" step="any" v-model="editedSum"></b-form-input>
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
            const vm = this;
            vm.$socket.emit('join_chat', {deal_id: this.id});
            vm.FReader.onload = function (e) {
                let uintArr = new Uint8Array(e.target.result);
                let content = uintArr.buffer;
                vm.$socket.emit('uploadChunk', {
                    content: content
                });
            };
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
                    _id: '',
                    name: '',
                    sum: '',
                    status: '', // статус сделки, новая, подтверждены условия/в процессе, завершенная, спорная
                    acceptedBySeller: false,
                    acceptedByBuyer: false,
                    seller: null,
                    buyer: null,
                    coin: 'PFR'
                },
                form: {
                    text: ''
                },
                sumModal: false,
                conditionsModal: false,
                /*sellerConditions:{
                    text: '',
                    editedText: ''
                },*/

                activeCondition: {
                    role: '',
                    text: '',
                    editedText: ''
                },
                editedSum: 0,
                conditionsEdition: false,
                // files upload
                chunkSize: 1024 * 100,
                FReader: new FileReader(),
                uploading: false,
                filesForUpload: [],
                attachments: [],

                reviewModal: false,
                review: {
                    rating: 0,
                    comment: ''
                },
                errors: ''
            }
        },
        sockets: {
            NotEnoughMoney: function () {
                this.$swal('Error', 'You don\'t have enough sum of coins in your wallet', 'error');
            },
            initMessages: function (data) {
                this.messages = [];
                for (let i = 0; i < data.messages.length; i++) {
                    this.messages.push(data.messages[i]);
                }
                this.counterparty = data.counterparty;
                this.deal = data.deal;
                if (!this.counterparty.profileImg) {
                    this.counterparty.profileImg = this.$config.staticUrl+'/images/default-user-img.png';
                } else {
                    this.counterparty.profileImg = this.$config.staticUrl+'/profile-pic/'+this.counterparty.profileImg;
                }

                const vm = this;
                vm.$cookie.set('jwt_token', vm.$auth.token().substr(4), {expires: 1, domain: vm.extractHostname(vm.$config.backendUrl)});
                vm.$nextTick(function () {vm.$refs['messages-box'].scrollTop = this.$refs['messages-box'].scrollHeight;});

                if (data.deal.status == 'completed'){
                    this.reviewModal = data.can_review;
                }
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
                this.reviewModal = true;
            },
            disputeChanged: function (data) {
                // reset data
                this.$socket.emit('leave_chat', {deal_id: this.id});
                this.$socket.emit('join_chat', {deal_id: this.id});
            },
            // files upload
            uploaderReady: function (data) {
                const vm = this;
                vm.uploadChunk(data.id, vm.attachments[data.id].file);
            },
            chunkUploaded: function (data) {
                const vm = this;
                vm.attachments[data.id].downloaded = data.downloaded;
                vm.attachments[data.id].progress = ((parseFloat(data.downloaded) /  vm.attachments[data.id].size)*100).toFixed(2);
                vm.uploadChunk(data.id, vm.attachments[data.id].file, data.downloaded);
            },
            uploadComplete: function (data) {
                const vm = this;
                vm.attachments[data.id].downloaded = vm.attachments[data.id].size;
                vm.attachments[data.id].progress = 100;
                vm.attachments[data.id]._id = data._id;
                vm.uploading = false;
                vm.startUploadCurrentFile();
            },
            uploadError: function (data) {

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
            extractHostname: function (url) {
                var hostname;
                //find & remove protocol (http, ftp, etc.) and get hostname

                if (url.indexOf("://") > -1) {
                    hostname = url.split('/')[2];
                }
                else {
                    hostname = url.split('/')[0];
                }

                //find & remove port number
                hostname = hostname.split(':')[0];
                //find & remove "?"
                hostname = hostname.split('?')[0];

                return hostname;
            },
            openUploadDialog: function () {
                this.$refs['file-input'].click();
            },
            fileChosen: function (e) {
                const vm = this;
                Array.from(e.target.files).forEach(function (item) {
                   vm.attachments.push({
                       name: item.name,
                       size: item.size,
                       file: item,
                       type: item.type,
                       progress: 0,
                       downloaded: 0,
                       _id: null
                   });
                   vm.filesForUpload.push({
                       id: vm.attachments.length - 1
                   });
                });
                if (!vm.uploading) {
                    vm.startUploadCurrentFile();
                }
            },
            startUploadCurrentFile: function () {
                const vm = this;
                if (vm.filesForUpload.length > 0) {
                    vm.uploading = true;
                    let file = vm.filesForUpload.shift();
                    if (file) {
                        vm.$socket.emit('startUpload', {
                            id: file.id,
                            name: vm.attachments[file.id].name,
                            size: vm.attachments[file.id].size
                        });
                    }
                }
            },
            uploadChunk: function (id, file, offset = 0) {
                const vm = this;
                let chunk = file.slice(offset, Math.min(offset+vm.chunkSize, file.size));
                vm.FReader.readAsArrayBuffer(chunk);
            },


            openConditions: function (role) {
                //this.conditionsModal = true;
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
                this.conditionsEdition = false;
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
                if (confirm('Are you sure that you want to accept deal and release sum from deposit to your counterparty?')) {
                    let data = {
                        deal_id: vm.id,
                    };
                    vm.$socket.emit('accept_deal', data);
                    vm.$swal('Success', 'Deal complete. Sum released from deposit', 'success');
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
            removeFile: function (index) {
                this.attachments.splice(index, 1);
            },
            onSubmit: function (e) {
                e.preventDefault();
                if (this.uploading) {
                    return;
                }
                if (this.form.text.trim() || this.attachments.length > 0) {
                    let data = {
                        deal_id: this.id,
                        text: this.form.text.trim(),
                        attachments: this.attachments
                    };
                    this.form.text = '';
                    this.attachments = [];
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
            },
            isType(filename) {
                return filename.split('.').pop();
            },
            cancelReview: function () {
                this.reviewModal = false;
            },
            submitReview: function () {
                this.reviewModal = false;
                let user_id = this.counterparty._id;
                let review = this.review;
                review.deal_id = this.deal._id;

                const vm = this;

                this.$http.post('/users/user/' + user_id + '/addReview', review).then(function (response) {
                    console.log(response);
                    vm.$router.push({name: 'deals'});
                    vm.$swal('Success', response.data.msg, 'success');
                }, function (err) {
                    if (err.response.status === 400) {
                        vm.errors = err.response.data.errors;
                    }
                    if (err.response.status === 500) {
                        vm.errorMsg = 'Some error occured. Try again later';
                    }
                });
                this.ratingModal = false;
            },
            isValid: function (key) {
                return this.errors.hasOwnProperty(key) ? 'invalid' : '';
            },
            errorMessage: function(key) {
                return this.errors.hasOwnProperty(key) ? this.errors[key].msg : '';
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
    .messages-box {
        background:#e0e0de;
        display:flex;
        flex-direction: column-reverse;
        overflow-y: auto;
        height: 420px;
    }
    ul.attachments-items {
        list-style-type: none;
    }
    ul.chat {
        width:100%;
        list-style-type: none;
        padding:18px;
        margin: 0;

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
        clear: both;
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

    div.rating {
        display: flex;
        justify-content: center;
        margin: 10px 0;
        direction: rtl;
    }

    div.rating label {
        float: left;
        width: 50px;
        height: 50px;
        margin: 0px 10px;
        overflow: hidden;
        text-align: center;
        background-size: contain;
        background-repeat: no-repeat;
        filter: grayscale(1);
    }
    div.rating input{
        display: none;
    }
    div.rating label:hover,
    div.rating input:checked+label,
    div.rating input:checked ~ label,
    div.rating label:hover ~ label{
        filter: grayscale(0);
    }

    div.rating .fill{
        background: #b0fb78;
        height: 100%;
    }

    .rating.tabs .nav-tabs {
        border-bottom: none!important;
    }

    .rating.tabs{
        margin-bottom: 20px;
    }

    .rating.tabs a.nav-link{
        border: 1px solid #ddd!important;
        border-radius: 100%;
        margin: 0 5px;
    }
    .modal .btn-success, .btn-secondary{
        margin-left:5px;
    }
    .img-deal {
        max-width: 70%;
    }
    .buy-sel-conditions h3 {
        text-align: center;
        padding-bottom: 20px;
    }
    .form-modal-conditions {
        height: 150px;
        overflow: hidden;
        resize: none;
    }
    .buy-sel-conditions .btn-secondary{
        margin-right: 10px;
    }
    .buy-sel-conditions .btn-sm{
        margin-top: 5px;
    }
    .rating span{
        display: none;
    }
    #comment{
        height: 155px;
        resize: none;
    }
</style>