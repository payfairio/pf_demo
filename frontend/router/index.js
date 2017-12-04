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

import SuggestionList from '@/components/routes/trust/List'
import SuggestionCreate from '@/components/routes/trust/Create'
import Suggestion from '@/components/routes/trust/Suggestion'

//exchanges
import MyExchanges from '@/components/routes/exchanges/List'
import Exchanges from '@/components/routes/exchanges/Exchanges'
import CreateExchange from '@/components/routes/exchanges/Create'

Vue.use(Router);

export default new Router({
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
            path: '/suggestions',
            name: 'suggestions',
            meta: {
                auth: {roles: 'trust'}
            },
            component: SuggestionList
        },
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
        // exchanges section
        {
            path: '/exchanges/my',
            name: 'my-exchanges',
            meta: {
                auth: {roles: 'client', forbiddenRedirect: '/disputes'}
            },
            component: MyExchanges
        },
        {
            path: '/exchanges',
            name: 'exchanges',
            meta: {
                auth: {roles: 'client', forbiddenRedirect: '/disputes'}
            },
            component: Exchanges
        },
        {
            path: '/exchanges/create',
            name: 'create-exchange',
            meta: {
                auth: {roles: 'client', forbiddenRedirect: '/disputes'}
            },
            component: CreateExchange
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