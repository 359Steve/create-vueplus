import ElementPlus from 'element-plus';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import 'element-plus/dist/index.css';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import './style.css';

window.ENV = __APP_ENV__;

const app = createApp(App);
app.use(ElementPlus);
app.use(router);
app.use(createPinia());
app.mount('#app');
