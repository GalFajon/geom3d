import { Geometry } from './Geometry.js';
import { THREE, viewer } from '../misc/DependencyManager.js';

import { LineMaterial } from '../three/fatlines/LineMaterial.js';
import { LineGeometry } from '../three/fatlines/LineGeometry.js';
import { Line2 } from '../three/fatlines/Line2.js';

export class Line extends Geometry {
    type = "Line"
    static material = new LineMaterial({
        color: 0xff0000,
        linewidth: 3,
        resolution: new THREE.Vector2(1000, 1000),
        dashed: false,
        depthTest: true,
        depthWrite: true
    });

    constructor(vectors, config = {}) {
        super(config.properties);

        this.vectors = vectors;

        if (config && config.material) this.material = config.material;
        else this.material = Line.material;

        this.update();

        // TODO: Add a way to color the geometries using custom materials

        this.model.userData = this;
    }

    flattenVectors(positions) {
        let flatArray = [];
        for (let [x, y, z] of positions) flatArray.push(x, y, z);
        return flatArray;
    }

    localizeVectors(flatPositions) {
        let localPositions = [0, 0, 0];

        let initialPosition = new THREE.Vector3(flatPositions[0], flatPositions[1], flatPositions[2]);

        for (let i = 3; i < flatPositions.length; i += 3) {
            let currentPosition = new THREE.Vector3(flatPositions[i], flatPositions[i + 1], flatPositions[i + 2]);
            currentPosition = currentPosition.clone().sub(initialPosition).toArray();

            localPositions.push(currentPosition[0], currentPosition[1], currentPosition[2]);
        }

        return localPositions;
    }

    update() {
        let localPositions = this.localizeVectors(this.flattenVectors(this.vectors));
        let geometry = new LineGeometry();

        geometry.setPositions(localPositions);

        if (this.model) {
            this.model.geometry.dispose();
            this.model.material.dispose();

            this.model.geometry = geometry;
        }
        else {
            this.model = new Line2(geometry, this.material);
            this.model.computeLineDistances();
            this.model.scale.set(1, 1, 1);
            this.model.position.set(...this.vectors[0]);
        }
    }
}