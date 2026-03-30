import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const doctorPath = path.resolve(__dirname, "./dist/doctor.js");
const require = createRequire(import.meta.url);

require(doctorPath);
