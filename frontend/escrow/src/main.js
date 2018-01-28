// styles
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import '../../../public/stylesheets/font-awesome.min.css'
import '../../../public/stylesheets/style.css'

// main part
import Vue from 'vue';
import axios from 'axios'
import VueAxios from 'vue-axios'
import BootstrapVue from 'bootstrap-vue'
import VueSweetAlert from 'vue-sweetalert'
import VueSocketio from 'vue-socket.io'
import router from './router'
import vueConfig from 'vue-config'
import Parallax from 'vue-parallaxy'
import App from './App.vue';
import VueEvents from 'vue-events'
const VueBreadcrumbs = require('vue2-breadcrumbs');

const VueCookie = require('vue-cookie');
import config from './config/config';
Vue.use(vueConfig, config);
Vue.use(VueCookie);
Vue.use(VueBreadcrumbs);

Vue.router = router;

Vue.use(VueAxios, axios);
Vue.axios.defaults.baseURL = config.backendUrl;  // todo: вынести в настройки
//Vue.use(BootstrapVue);
// костыль до обновы бутстрап-вью
let originalVueComponent = Vue.component;
Vue.component = function(name, definition) {
    if (name === 'bFormCheckboxGroup' || name === 'bCheckboxGroup' ||
        name === 'bCheckGroup' || name === 'bFormRadioGroup') {
        definition.components = {bFormCheckbox: definition.components[0]}
    }
    originalVueComponent.apply(this, [name, definition])
};
Vue.use(BootstrapVue);
Vue.component = originalVueComponent;
// конец костыля
Vue.use(VueSweetAlert);
const moment = require('moment');
require('moment/locale/en-gb');
Vue.use(require('vue-moment'), {
    moment
});

Vue.use(VueEvents);
Vue.use(VueSocketio, config.staticUrl);

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

new Vue({
    el: '#app',
    router,
    render: h => h(App)
});
