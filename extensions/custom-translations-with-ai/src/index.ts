// import { defineInterface } from '@directus/extensions-sdk';
// import InterfaceComponent from './interface.vue';

// export default defineInterface({
// 	id: 'custom',
// 	name: 'Custom',
// 	icon: 'box',
// 	description: 'This is my custom interface!',
// 	component: InterfaceComponent,
// 	options: null,
// 	types: ['string'],
// });

import { defineInterface } from "@directus/extensions-sdk";
import InterfaceComponent from "./interface.vue";

export default defineInterface({
  id: "custom-translations-with-ai", // unique ID
  name: "Translations with AI Checkbox & Button",
  icon: "translate",
  description:
    "Native translations + per-field checkboxes + AI translate button",
  component: InterfaceComponent,
  types: ["alias"], // required for translations field
  localTypes: ["translations"], // crucial – makes it appear for translations fields
  relational: true,
  group: "relational",
  options: [], // add any config options here if needed
});
