<template>
    <div class="blog-list">
        <div class="container">
            <h1>Blog</h1>
            <div v-if="!loading">
                <b-row v-for="item in blogItems" class="blog-item" :key="item.id">
                    <b-col>
                        <img :src="$config.staticUrl+item.image">
                    </b-col>
                    <b-col sm="10">
                        <h4><router-link :to="{name: 'blog-post', params: {url: item.url}}">{{item.name}}</router-link></h4>
                        {{item.introtext}}
                    </b-col>
                </b-row>
            </div>
            <div v-if="loading">Loading...</div>
            <b-pagination-nav size="md" :linkGen="linkGenerator" :number-of-pages="totalPages" :value="currentPage"></b-pagination-nav>
        </div>
    </div>
</template>
<script>
    export default {
        name: 'Blog',
        data: function () {
            return {
                onPage: 10,
                blogItems: [],
                totalPages: 0,
                currentPage: 0,
                loading: false,
            };
        },
        created: function () {
            this.getPosts();
        },
        methods: {
            linkGenerator: function (pageNum) {
                return {to: 'blog', query: {page: pageNum}};
            },
            getPosts: function () {
                const vm = this;
                vm.loading = true;
                vm.$http.get('/blog?limit='+this.onPage+'&offset='+((vm.$route.query.page ? vm.$route.query.page - 1 : 0) * vm.onPage)).then(function (response) {
                    vm.blogItems = response.data.items;
                    vm.totalPages = Math.ceil(parseInt(response.data.total) / vm.onPage);
                    vm.currentPage = vm.$route.query.page ? parseInt(vm.$route.query.page) : 1;
                    vm.loading = false;
                }, function (err) {
                    console.log(err);
                    vm.loading = false;
                });
            }
        },
        watch: {
            '$route.query.page': function (val, oldVal) {
                if (oldVal !== val) {
                    this.getPosts();
                }
            }
        }
    }
</script>
<style scoped>
.blog-item {
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    padding-bottom: 10px;
    margin: 15px 0;
}
</style>