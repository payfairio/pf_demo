<template>
    <div class="blog-post">
        <div v-html="content"></div>
    </div>
</template>
<script>
    export default {
        name: 'BlogPost',
        props: ['url'],
        data: function () {
            return {
                content: ''
            };
        },
        created: function () {
            this.getPost();
        },
        methods: {
            getPost: function () {
                const vm = this;
                vm.$http.get('/blog/'+vm.url).then(function (response) {
                    vm.content = response.data.content;
                }, function (err) {
                    console.log(err);
                });
            }
        },
    }
</script>
<style scoped>

</style>