<template>
    <div :id="'ex-'+id+'-manage'">
    	<div class="container">
	        <b-card :header="'Exchange #' + id">

	        </b-card>
    	</div>
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
