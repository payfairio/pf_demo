<template>
    <div class="profile">
        <div class="container">
            <b-row align-h="center">
                <b-col sm="12" md="4">
                    <b-card align="left">
                        <b-alert variant="danger"
                                 dismissible
                                 :show="errorMsg != ''"
                                 @dismissed="errorMsg=''">
                            {{errorMsg}}
                        </b-alert>
                        <div class="profile-card">

                            <img :src="$props.id === $auth._id ? $auth.user().profileImg : profileImg">
                            <h2>{{username}}</h2>
                            <div class="review no-float">
                                <span><b>{{averageRating}}</b></span><span></span>
                            </div>

                        </div>
                        <div class="tabs">
                            <ul v-if="!$props.id">
                                <li @click="tab = 1, visible=true" :class="{active : tab === 1}">Change profile image</li>
                                <li @click="tab = 2, visible=false" :class="{active : tab === 2}">Rating</li>
                            </ul>
                            <ul v-else>
                                <li @click="tab = 1, visible=true" :class="{active : true}">Rating</li>
                            </ul>
                        </div>
                        </b-card>
                </b-col>
                <b-col sm="12" md="8" class="card justify-content-center">
                    <div v-if="visible && !$props.id" class="img-tab">
                        <b-form v-if="!$props.id || $auth.user()._id == $props.id" @submit="onSubmit" enctype="multipart/form-data">
                            <b-form-group id="imgInputGroup" label="Change profile image:" label-for="profileImg">
                                <image-upload v-model="form.profileImg" :init="form.profileImg" :width="256" :height="256" :label="'Download 256 X 256'"></image-upload>
                            </b-form-group>
                            <b-button type="submit" variant="primary">Save</b-button>
                        </b-form>
                    </div>
                    <div v-else class="review-tab">
                        <h3>Reviews:</h3>
                         <div v-for="review in reviews" class="review">
                             <p>
                                <b>By:</b> <router-link :to="{name: 'user-by-id', params: {id: review.author._id}}">{{review.author.username}}</router-link><br>
                            </p>
                            <p class="float-left"><b>Rating</b>:</p>
                            <div v-for="i in review.rating">
                                <span></span>
                            </div>

                           <p><b>Review:</b>{{review.comment}}</p>
                           <p v-if="isToday(review.created_at)" class="date">Today, {{review.created_at | moment("HH:mm:ss")}}</p>
                           <p v-if="!isToday(review.created_at)" class="date">{{review.created_at | moment("MMMM Do YYYY, HH:mm:ss")}}</p>

                         </div>
                    </div>
                </b-col>
            </b-row>
        </div>
    </div>
</template>
<script>
    import imageUpload from '../../modules/image-upload.vue';
    export default {
        name: 'Profile',
        props: ['id'],
        components: {
            'image-upload': imageUpload
        },
        data: () => {
            return {
                form: {
                    profileImg: '',
                },
                errors: {},
                errorMsg: '',
                reviews: [],
                username: '',
                profileImg: '',
                visible: true,
                tab: 1
            }
        },
        created: function () {
            this.getUser();
        },
        methods: {
            dataURItoBlob: function (dataURI) {
                // convert base64/URLEncoded data component to raw binary data held in a string
                var byteString;
                if (dataURI.split(',')[0].indexOf('base64') >= 0) {
                    byteString = atob(dataURI.split(',')[1]);
                } else {
                    byteString = unescape(dataURI.split(',')[1]);
                }
                // separate out the mime component
                var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
                // write the bytes of the string to a typed array
                var ia = new Uint8Array(byteString.length);
                for (var i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                return new Blob([ia], {type:mimeString});
            },
            onSubmit: function (e) {
                e.preventDefault();
                const vm = this;
                if (!vm.form.profileImg) {
                    return;
                }
                vm.errorMsg = '';
                let data = new FormData();
                data.append('profileImg', vm.dataURItoBlob(vm.form.profileImg));
                this.$http.post('/users/profile', data).then(response => {
                    vm.form.profileImg = '';
                    vm.$auth.fetch();
                }).catch(err => {
                    vm.errorMsg = 'Some error occured. Try again later';
                    console.log(err);
                });
            },
            isValid: function (key) {
                return this.errors.hasOwnProperty(key) ? 'invalid' : '';
            },
            errorMessage: function(key) {
                return this.errors.hasOwnProperty(key) ? this.errors[key].msg : '';
            },
            getUser: function () {
                const vm = this;

                if (this.$props.id){
                    this.$http.get('/users/user/' + this.$props.id).then(response => {
                        vm.reviews = response.data.reviews;
                        vm.username = response.data.user.username;
                        vm.profileImg = response.data.user.profileImg;
                    }, err => {
                        console.log(err);
                    });
                } else {
                    vm.username = vm.$auth.user().username;
                    vm.profileImg = vm.$auth.user().profileImg;
                    this.$http.get('/users/user/' + this.$auth.user()._id + '/review').then(response => {
                        vm.reviews = response.data;
                    }, err => {
                        console.log(err);
                    });
                }
            },
            isToday(date) {
                date = new Date(date);
                return new Date().toLocaleDateString() === date.toLocaleDateString();
            }
        },
        watch: {
            id: function () {
                this.getUser();
            }
        },
        computed: {
            averageRating: function(){
                const vm = this;
                var review = 0;
                var totalRating = 0;
                for (var i = 0; i < vm.reviews.length; i++){
                    review = vm.reviews[i].rating;
                    totalRating = totalRating + review;
                }
                if(Object.keys(vm.reviews).length === 0){
                    return 0;
                } else{
                    return (Math.round(totalRating / vm.reviews.length * 100) / 100);    
                }
                
            }
        }
    }
</script>
<style scoped>
    .card{
        color:#212121;
    }
    .profile-card img{
        box-shadow: 0px 0px 10px 0px #969696;
    }
    .profile-card h2{
        font-weight: 700;
        font-size: 30px;
    }
    .tabs ul{
        font-size: 16px;
        padding-left: 0;
        list-style-type: none;
        text-align: center;
        margin: 0 30px;
    }
    .tabs ul li{
        margin: 15px 0;
        cursor: pointer;
        padding: 10px;
        color:#010101;
        transition: .3s;
        font-size: 16px;
    }
    .tabs ul li.active{
        background-color: #49e1cd;
        color:#000;
    }
    .tabs ul li.active:hover{
        background-color: #49e1cd;
    }
    .tabs ul li:hover{
        background-color: #49e1cda6;
    }
    .img-tab{
        text-align: center;
    }
    .review.no-float span:first-child{
        background: none;
        float:none;
    }
    .review.no-float span:last-child{
        float: none;
        display: inline-block;
        vertical-align: top;
    }
    .review-tab .review{
        padding-top: 15px;
        border-bottom: 1px solid #f1f1f1;
    }
    .review-tab .review:last-child {
        border-bottom: none;
    }
    .date{
        font-style: italic;
    }
</style>