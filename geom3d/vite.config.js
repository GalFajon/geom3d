import { defineConfig } from 'vite'
import * as path from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, './main.js'),
            name: 'geom3d',
            fileName: (format) => `geom3d.${format}.js`
        }
    }
})