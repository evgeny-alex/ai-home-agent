import { migrate } from "./database.js";
await migrate();
console.info("Property monitor schema is ready");
