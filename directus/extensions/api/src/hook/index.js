import { setupRouter } from "../api/index.js";

export default {
  id: "api",
  handler: (router, context) => {
    setupRouter(router, context);
  },
};
