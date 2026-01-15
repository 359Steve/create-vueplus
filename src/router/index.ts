import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory('/'),
    routes: [
        {
            path: '/',
            name: 'Home',
            component: () => import('@/pages/home.vue'),
        },
    ],
});

router.beforeEach((_to, _from, _next) => {
    return _next();
});

router.afterEach((_to, _from) => {
    return true;
});

export default router;
