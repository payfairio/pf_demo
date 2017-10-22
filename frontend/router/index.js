import Vue from 'vue'
import Router from 'vue-router'

import Login from '@/components/routes/users/Login'
import Register from '@/components/routes/users/Register'
import Profile from '@/components/routes/users/Profile'
import List from '@/components/routes/deals/List'
import CreateDeal from '@/components/routes/deals/Create'
import Deal from '@/components/routes/deals/Deal'
import EscrowList from '@/components/routes/escrow/EscrowList'
import EscrowDeal from '@/components/routes/escrow/EscrowDeal'

Vue.use(Router);

export default new Router({
    routes: [
        // client section
        {
            path: '/',
            name: 'deals',
            meta: {
                auth: {roles: 'client', forbiddenRedirect: '/disputes/'}
            },
            component: List,
        },
        {
            path: '/deals/create',
            name: 'create-deal',
            meta: {
                auth: 'client'
            },
            component: CreateDeal,
        },
        {
            path: '/deals/deal/:id',
            name: 'deal',
            meta: {
                auth: {roles: 'client'}
            },
            component: Deal,
            props: true
        },
        // escrow section
        {
            path: '/disputes',
            name: 'disputes',
            meta: {
                auth: 'escrow'
            },
            component: EscrowList,
        },
        {
            path: '/disputes/dispute/:id',
            name: 'dispute',
            meta: {
                auth: {roles: 'escrow'}
            },
            component: EscrowDeal,
            props: true
        },
        // common actions
        {
            path: '/profile',
            name: 'profile',
            meta: {
                auth: true
            },
            component: Profile,
        },
        // login and register
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
        },
        {
            path: '/register/:invId',
            name: 'register-by-inv',
            meta: {
                auth: false
            },
            component: Register,
            props: true
        }
    ]
})