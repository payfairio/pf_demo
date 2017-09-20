// styles
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import '../public/stylesheets/style.css'

// main part
import Vue from 'vue';
import axios from 'axios'
import VueAxios from 'vue-axios'
import BootstrapVue from 'bootstrap-vue';
import router from './router'

import App from './App.vue';

Vue.router = router;

Vue.use(VueAxios, axios);
Vue.axios.defaults.baseURL = 'http://localhost:3000';  // todo: вынести в настройки
Vue.use(BootstrapVue);

Vue.use(require('@websanova/vue-auth'), {
    auth: require('./auth/authDriver.js'),
    http: require('@websanova/vue-auth/drivers/http/axios.1.x.js'),
    router: require('@websanova/vue-auth/drivers/router/vue-router.2.x.js'),
    rolesVar: 'type',
    authRedirect: {path: '/login'},
    forbiddenRedirect: {path: '/403'},
    notFoundRedirect: {path: '/404'},
    registerData: {url: 'users/register', method: 'POST', redirect: '/', fetchUser: false},
    loginData: {url: 'users/login', method: 'POST', redirect: '/', fetchUser: true},
    logoutData: {url: 'users/logout', method: 'POST', redirect: '/login', makeRequest: false},
    fetchData: {url: 'users/info', method: 'GET', enabled: true},
    refreshData: {url: 'users/refresh', method: 'GET', enabled: false, interval: 30},
    parseUserData: function (data) {
        return data;
    }
});

//import vueConfig from 'vue-config';
/*const config = {
    apiUrl: '/api',
    apiFiles: '/api-files'
};*/
//Vue.use(vueConfig, config);


new Vue({
    el: '#app',
    router,
    render: h => h(App)
});
