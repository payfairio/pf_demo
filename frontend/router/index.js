import Vue from 'vue'
import Router from 'vue-router'

import Login from '@/components/routes/users/Login'
import Register from '@/components/routes/users/Register'
import Profile from '@/components/routes/users/Profile'
import List from '@/components/routes/deals/List'
import CreateDeal from '@/components/routes/deals/Create'
import Deal from '@/components/routes/deals/Deal'

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
            path: '/deals/create',
            name: 'create-deal',
            meta: {
                auth: true
            },
            component: CreateDeal,
        },
        {
            path: '/deals/deal/:id',
            name: 'deal',
            meta: {
                auth: true
            },
            component: Deal,
            props: true
        },
        {
            path: '/profile',
            name: 'profile',
            meta: {
                auth: true
            },
            component: Profile,
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