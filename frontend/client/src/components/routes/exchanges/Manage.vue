<template>
    <div :id="'ex-'+id+'-manage'">
        <b-card :header="'Exchange #' + id">

        </b-card>
    </div>
</template>

<script>
export default {
    name: 'ManageExchange',
    props: ['id']
}
</script>

<style scoped>

</style>
