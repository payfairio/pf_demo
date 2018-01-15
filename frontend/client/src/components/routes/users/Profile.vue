<template>
    <div class="profile">
        <b-row align-h="center">
            <b-col sm="12" md="4">
                <b-card header="Profile"
                        align="left">
                    <b-alert variant="danger"
                             dismissible
                             :show="errorMsg != ''"
                             @dismissed="errorMsg=''">
                        {{errorMsg}}
                    </b-alert>
                    <div class="profile-card">
                        <h2>{{username}}</h2>

                        <img :src="$props.id ? profileImg : $auth.user().profileImg">

                        <div class="review no-float">
                            <span><b>{{averageRating}}</b></span><span></span>
                        </div>

                    </div>
                    <b-tabs>
                        <template slot="tabs">
                            <b-nav-item>Change profile image</b-nav-item>
                        </template>
                        <template slot="tabs">
                            <b-nav-item>Rating</b-nav-item>
                        </template>
                    </b-tabs>
                </b-card>
            </b-col>
            <b-col sm="12" md="8" class="card justify-content-center">
                    <b-form v-if="!$props.id || $auth.user()._id == $props.id" @submit="onSubmit" enctype="multipart/form-data">
                        <b-form-group id="imgInputGroup" label="Change profile image:" label-for="profileImg">
                            <image-upload v-model="form.profileImg" :init="form.profileImg" :width="256" :height="256" :label="'Загрузить 256 X 256'"></image-upload>
                        </b-form-group>
                        <b-button type="submit" variant="primary">Save</b-button>
                    </b-form>
                    <h3>Reviews:</h3>
                     <div v-for="review in reviews" class="review">
                         <p>
                            <b>By:</b> <router-link :to="{name: 'user-by-id', params: {id: review.author._id}}">{{review.author.username}}</router-link><br>
                        </p>
                        <p class="float-left">Rating:</p>
                        <div v-for="i in review.rating">
                            <span></span>
                        </div>
                       <p>{{review.comment}}</p>
                     </div>
            </b-col>
        </b-row>
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
                profileImg: ''
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
                        console.log(response);
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
                //return (totalRating / vm.reviews.length).toFixed(1);
                return (Math.round(totalRating / vm.reviews.length * 100) / 100);
            }
        }
        //reviews.length - total count of reviews
        //review.rating - rating of current review
    }
</script>
<style scoped>
    .review.no-float span:first-child{
        background: none;
        float:none;
    }
    .review.no-float span:last-child{
        float: none;
        display: inline-block;
        vertical-align: top;
    }
</style>