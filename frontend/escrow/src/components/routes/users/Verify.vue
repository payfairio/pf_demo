<template>
    
</template>
<script>
export default {
    name: 'Verify',
    props: [
        'code'
    ],
    created: function () {
        const vm = this;
        if (vm.code) {
            vm.$http.get('/users/verify/' + vm.code).then(function (response) {
                vm.$auth.fetch();
                vm.$router.push(vm.$auth.check() ? {path: '/'} : {name: 'login'});
                vm.$swal('Success', 'Your email was verified!', 'success');
            }).catch(function (err) {
                vm.$router.push({path: '/'});
                if (err.response.data.error.msg) {
                    vm.$swal('Error', err.response.data.error.msg, 'error');
                } else {
                    console.log(err.response);
                    vm.$swal('Error', 'Something wrong', 'error');
                }
            });
        }
    }
}
</script>
<style scoped>

</style>
