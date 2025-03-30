import { Geometry } from './Geometry.js';
import { THREE } from '../misc/DependencyManager.js';

class Point extends Geometry {
    constructor(vectors) {
        super();
        this.vectors = vectors;
        this.type = "Point";
    }
}

export { Point };
