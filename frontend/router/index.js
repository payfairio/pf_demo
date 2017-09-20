import Vue from 'vue'
import Router from 'vue-router'

import Login from '@/components/routes/users/Login'
import Register from '@/components/routes/users/Register'
import List from '@/components/routes/deals/List'

Vue.use(Router);

export default new Router({
    routes: [
        {
            path: '/',
            name: 'deals',
            meta: {
                auth: true
            },
            component: List,
        },
        {
            path: '/login',
            name: 'login',
            meta: {
                auth: false
            },
            component: Login
        },
        {
            path: '/register',
            name: 'register',
            meta: {
                auth: false
            },
            component: Register
        }
    ]
})