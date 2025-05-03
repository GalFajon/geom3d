import { Geometry } from './Geometry.js';

class Point extends Geometry {
    type = "Point"
    highlighted = false
    
    constructor(vectors) {
        super();
        this.vectors = vectors;
    }
}

export { Point };
