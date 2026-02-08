import './assets/main.css';
import 'tdesign-vue-next/es/style/index.css';

import { createPinia } from 'pinia';
import { createApp } from 'vue';
import TDesign from 'tdesign-vue-next';

import App from './App.vue';
import router from './router';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(TDesign);

app.mount('#app');
