import Vue from 'vue'
import Router from 'vue-router'

import Login from '@/components/routes/users/Login'
import Register from '@/components/routes/users/Register'
import Profile from '@/components/routes/users/Profile'
import Wallet from '@/components/routes/users/Wallet'

import Verify from '@/components/routes/users/Verify'
import ResetPassword from '@/components/routes/users/Forgot'

import List from '@/components/routes/deals/List'
import CreateDeal from '@/components/routes/deals/Create'
import Deal from '@/components/routes/deals/Deal'

import Blog from '@/components/routes/blog/List'
import BlogPost from '@/components/routes/blog/Post'

import Team from '@/components/routes/pages/Team'
import About from '@/components/routes/pages/About'
//exchanges
import Exchange from '@/components/routes/exchanges/Exchange'
import MyExchanges from '@/components/routes/exchanges/List'
import Exchanges from '@/components/routes/exchanges/Exchanges'

import CreateExchange from '@/components/routes/exchanges/Create'
import ManageExchange from '@/components/routes/exchanges/Manage'

Vue.use(Router);

export default new Router({
    mode: 'history',
    scrollBehavior (to, from, savedPosition) {
        if (from.name === to.name && to.name === 'exchanges') {
            return savedPosition;
        }
        if (!savedPosition || to !== from) {
            return { x: 0, y: 0 }
        }
        return savedPosition;
    },
    routes: [
        // client section
        {
            path: '/deals',
            name: 'deals',
            meta: {
                auth: {roles: 'client'}
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
            path: '/my-ads',
            name: 'my-exchanges',
            meta: {
                auth: {roles: 'client'}
            },
            component: MyExchanges
        },
        {
            path: '/',
            name: 'exchanges',
            component: Exchanges,
            meta: {
                breadcrumb: 'Home'
            },
        },
        {
            path: '/exchanges/create',
            name: 'create-exchange',
            meta: {
                auth: {roles: 'client'}
            },
            component: CreateExchange
        },
        {
            path: '/exchange/:id',
            name: 'exchange',
            component: Exchange,
            props: true
        },
        {
            path: '/exchange/:id/manage',
            name: 'manage-exchange',
            meta: {
                auth: {roles: 'client'}
            },
            props: true,
            component: CreateExchange
        },
        {
            path: '/blog',
            name: 'blog',
            component: Blog
        },
        {
            path: '/blog/:url',
            name: 'blog-post',
            component: BlogPost,
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

        {
            path: '/team',
            name: 'team',
            component: Team,
        },
        {
            path: '/about',
            name: 'about',
            component: About,
        },
    ]
})