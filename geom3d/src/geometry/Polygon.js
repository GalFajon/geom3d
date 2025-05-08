import { Geometry } from './Geometry.js';
import { THREE } from '../misc/DependencyManager.js';
import { ConvexGeometry } from '../three/convexgeom/ConvexGeometry.js';
import * as earcut from 'earcut'

export class Polygon extends Geometry {
    type = "Polygon"
    static material = new THREE.MeshBasicMaterial({ color: 'purple', side: THREE.DoubleSide });

    vectors = [];
    holes = [];

    constructor(positions, properties) {
        super(properties);

        this.vectors = positions[0];
        this.holes = this.getHoles(positions);

        this.material = Polygon.material;

        this.model = new THREE.Mesh(this.generateGeometry(positions), this.material);
        this.model.position.set(positions[0][0][0], positions[0][0][1], positions[0][0][2]);
        this.model.userData = this;
    }

    getHoles(positions) {
        let holes = [];

        for (let i = 1; i < positions.length; i++) holes.push(positions[i]);

        return holes;
    }

    localizeVectors(positions) {
        let initialPosition = new THREE.Vector3(positions[0][0][0], positions[0][0][1], positions[0][0][2]);
        let localPositions = [];

        for (let i = 0; i < positions.length; i++) {
            let positionSet = positions[i];

            localPositions.push([]);

            for (let j = 0; j < positionSet.length; j++) {
                let [x, y, z] = positionSet[j];
                let currentPosition = new THREE.Vector3(x, y, z);

                currentPosition = currentPosition.sub(initialPosition).toArray();

                localPositions[i].push(currentPosition)
            }
        }

        return localPositions
    }

    generateGeometry(positions) {
        let localPositions = this.localizeVectors(positions);
        let data = earcut.flatten(localPositions);
        let triangles = earcut.default(data.vertices, data.holes, data.dimensions);

        let geometry = new THREE.Geometry();

        for (let i = 0; i < data.vertices.length; i += 3) {
            geometry.vertices.push(new THREE.Vector3(data.vertices[i], data.vertices[i + 1], data.vertices[i + 2]))
        }

        for (let i = 0; i < triangles.length; i += 3) {
            geometry.faces.push(new THREE.Face3(triangles[i], triangles[i + 1], triangles[i + 2]))
        }

        geometry.computeFaceNormals();

        return geometry;
    }

    update() {
        let geometry = this.generateGeometry([this.vectors, ...this.holes]);

        this.model.geometry.dispose();
        this.model.geometry = geometry;
        this.model.position.set(this.vectors[0][0], this.vectors[0][1], this.vectors[0][2]);
    }
}