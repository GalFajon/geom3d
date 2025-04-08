import { Geometry } from './Geometry.js';

class Point extends Geometry {
    constructor(vectors) {
        super();
        this.vectors = vectors;
    }
}

export { Point };
