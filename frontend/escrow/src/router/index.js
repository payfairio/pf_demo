import Vue from 'vue'
import Router from 'vue-router'

import Login from '@/components/routes/users/Login'
import Register from '@/components/routes/users/Register'


import Profile from '@/components/routes/users/Profile'


import Wallet from '@/components/routes/users/Wallet'

import Verify from '@/components/routes/users/Verify'
import ResetPassword from '@/components/routes/users/Forgot'

import EscrowList from '@/components/routes/escrow/EscrowList'
import EscrowDeal from '@/components/routes/escrow/EscrowDeal'

Vue.use(Router);

export default new Router({
    mode: 'history',
    routes: [
        // escrow section
        {
            path: '/',
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
            path: '/user/:id',
            name: 'user-by-id',
            meta: {
                auth: true
            },
            component: Profile,
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
        },
        // user's wallet
        {
            path: '/wallet',
            name: 'wallet',
            meta: {
                auth: true
            },
            component: Wallet
        },
        {
            path: '/verify/:code',
            name: 'verify',
            component: Verify,
            props: true
        },
        {
            path: '/resetPassword',
            name: 'resetPassword',
            component: ResetPassword
        },
        {
            path: '/reset/:code',
            name: 'resetPasswordCode',
            component: ResetPassword,
            props: true
        },
    ]
})