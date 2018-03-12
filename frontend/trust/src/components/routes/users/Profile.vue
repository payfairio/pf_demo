<template>
    <div class="container">
        <div class="profile">
            <b-row align-h="center">
                <b-col sm="12" md="5">
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
                            <img :src="profileImg">
                        </div>
                        <hr>
                        <b-form v-if="!$props.id || $auth.user()._id == $props.id" @submit="onSubmit" enctype="multipart/form-data">
                            <b-form-group id="imgInputGroup" label="Change profile image:" label-for="profileImg">
                                <image-upload v-model="form.profileImg" :init="form.profileImg" :width="256" :height="256" :label="'Download 256 X 256'"></image-upload>
                            </b-form-group>
                            <b-button type="submit" variant="primary">Save</b-button>
                        </b-form>
                        <hr>
                        <h3>Reviews:</h3>
                        <div v-for="review in reviews" class="review">
                            <p>
                                <b>By:</b> <router-link :to="{name: 'user-by-id', params: {id: review.author._id}}">{{review.author.username}}</router-link><br>
                                <b>Rating:</b> {{review.rating}}<br>
                                <b>Comment:</b><br>
                                {{review.comment}}
                            </p>
                            <hr>
                        </div>
                    </b-card>
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
        data: function () {
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
        created: function(){
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
                const vm = this;
                e.preventDefault();
                vm.errorMsg = '';
                let data = new FormData();
                data.append('profileImg', this.dataURItoBlob(this.form.profileImg));
                this.$http.post('/users/profile', data).then(function (response) {
                    console.log(response);
                    vm.form.profileImg = '';
                    vm.$auth.fetch();
                }, function (err) {
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
            getUser: function(){
                const vm = this;

                if (this.$props.id){
                    this.$http.get('/users/user/' + this.$props.id).then(function (response){
                        console.log(response);
                        vm.reviews = response.data.reviews;
                        vm.username = response.data.user.username;
                        vm.profileImg = response.data.user.profileImg;
                    }, function(err){
                        console.log(err);
                    });
                } else {
                    vm.username = vm.$auth.user().username;
                    vm.profileImg = vm.$auth.user().profileImg;
                    this.$http.get('/users/user/' + this.$auth.user()._id + '/review').then(function (response){
                        vm.reviews = response.data;
                    }, function(err){
                        console.log(err);
                    });
                }
            }
        },
        watch: {
            id: function(){
                this.getUser();
            }
        }
    }
</script>
<style>

</style>