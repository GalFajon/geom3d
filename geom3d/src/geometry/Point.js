import { Geometry } from './Geometry.js';

class Point extends Geometry {
    type = "Point"
    highlighted = false
    
    constructor(vectors, properties) {
        super(properties);
        this.vectors = vectors;
    }
}

export { Point };
