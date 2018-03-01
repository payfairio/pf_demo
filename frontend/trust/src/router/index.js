import Vue from 'vue'
import Router from 'vue-router'

import Login from '@/components/routes/users/Login'
import Register from '@/components/routes/users/Register'
import Profile from '@/components/routes/users/Profile'
import Wallet from '@/components/routes/users/Wallet'

import SuggestionList from '@/components/routes/trust/List'
import SuggestionCreate from '@/components/routes/trust/Create'
import Suggestion from '@/components/routes/trust/Suggestion'

Vue.use(Router);

export default new Router({
    mode: 'history',
    routes: [
        //trust sections
        {
            path: '/suggestions/suggestion/:id',
            name: 'suggestion',
            meta: {
                auth: {roles: 'trust'}
            },
            component: Suggestion,
            props: true
        },
        {
            path: '/suggestions/create',
            name: 'create-suggestion',
            meta: {
                auth: {roles: 'trust'}
            },
            component: SuggestionCreate
        },
        {
            path: '/',
            name: 'suggestions',
            meta: {
                auth: {roles: 'trust'}
            },
            component: SuggestionList
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
        }
    ]
})