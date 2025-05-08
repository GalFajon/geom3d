import { Geometry } from './Geometry.js';

class Point extends Geometry {
    type = "Point"
    highlighted = false
    
    constructor(vectors, config = {}) {
        super(config.properties);
        this.vectors = vectors;
    }
}

export { Point };