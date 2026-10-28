import {defineConfig} from "@playwright/test";
export default defineConfig({testDir:"./pruebas-contratos",testMatch:"*.e2e.ts",workers:1,timeout:60000,reporter:[["list"]],outputDir:"test-results/contratos",use:{baseURL:"http://127.0.0.1:5196",channel:"chrome",trace:"off",video:"off",screenshot:"off"}});
