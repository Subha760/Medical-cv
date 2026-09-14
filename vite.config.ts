import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const workerCompatibility = 'if(!Array.prototype.at)Object.defineProperty(Array.prototype,"at",{value:function(i){return this[i<0?this.length+i:i]},configurable:true,writable:true});if(!String.prototype.at)Object.defineProperty(String.prototype,"at",{value:function(i){i=i<0?this.length+i:i;return this.charAt(i)||void 0},configurable:true,writable:true});';

export default defineConfig({
  base: './',
  build: { target: 'chrome70' },
  worker: { rollupOptions: { output: { banner: workerCompatibility } } },
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
  },
});
