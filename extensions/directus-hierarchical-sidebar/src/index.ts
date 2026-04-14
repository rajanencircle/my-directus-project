import ModuleComponent from './module.vue';

export default {
  id: 'hierarchical-sidebar',
  name: 'Dynamic Hierarchy',
  icon: 'account_tree',
  routes: [
    {
      path: '',
      component: ModuleComponent,
    },
  ],
};
