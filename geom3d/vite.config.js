import { defineConfig } from 'vite'
import * as path from 'path';

export default defineConfig({
    server: {
        cors: true
    },
    build: {
        lib: {
            entry: path.resolve(__dirname, './geom3d.js'),
            name: 'geom3d',
            fileName: (format) => `geom3d.${format}.js`
        }
    }
})