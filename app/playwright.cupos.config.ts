import {defineConfig} from "@playwright/test";
export default defineConfig({testDir:"./pruebas-cupos",testMatch:"*.e2e.ts",workers:1,timeout:90000,reporter:[["list"]],outputDir:process.env.CUPOS_EVIDENCIA?`${process.env.CUPOS_EVIDENCIA}/resultados`:"test-results/cupos",use:{baseURL:"http://127.0.0.1:5196",channel:"chrome",trace:"off",video:"off",screenshot:"off"}});
