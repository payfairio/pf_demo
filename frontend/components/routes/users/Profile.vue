<template>
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
                        <h2>{{$auth.user().username}}</h2>
                        <img :src="$auth.user().profileImg">
                    </div>
                    <hr>
                    <b-form @submit="onSubmit" enctype="multipart/form-data">
                        <b-form-group id="imgInputGroup" label="Change profile image:" label-for="profileImg">
                            <image-upload v-model="form.profileImg" :init="form.profileImg" :width="256" :height="256" :label="'Загрузить 256 X 256'"></image-upload>
                        </b-form-group>
                        <b-button type="submit" variant="primary">Save</b-button>
                    </b-form>
                </b-card>
            </b-col>
        </b-row>
    </div>
</template>
<script>
    import imageUpload from '../../modules/image-upload.vue';
    export default {
        name: 'Profile',
        components: {
            'image-upload': imageUpload
        },
        data: function () {
            return {
                form: {
                    profileImg: '',
                },
                errors: {},
                errorMsg: ''
            }
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
            }
        },
        watch: {

        }
    }
</script>
<style>

</style>