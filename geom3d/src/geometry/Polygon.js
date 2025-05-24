import { Geometry } from './Geometry.js';
import { THREE } from '../misc/DependencyManager.js';
import { ConvexGeometry } from '../three/convexgeom/ConvexGeometry.js';
import * as earcut from 'earcut'

import { LineMaterial } from '../three/fatlines/LineMaterial.js';
import { LineGeometry } from '../three/fatlines/LineGeometry.js';
import { Line2 } from '../three/fatlines/Line2.js';

import { booleanContains } from "@turf/boolean-contains";
import * as turf from "@turf/turf";

export class Polygon extends Geometry {
    type = "Polygon"
    static material = new THREE.MeshBasicMaterial({ color: 'purple', side: THREE.DoubleSide });
    static lineMaterial = new LineMaterial({
        color: 0x000000,
        linewidth: 1,
        resolution: new THREE.Vector2(1000, 1000),
        dashed: false,
        depthTest: true,
        depthWrite: true
    });

    vectors = [];
    holes = [];

    constructor(positions, config = {}) {
        super(config.properties);

        this.vectors = positions[0];
        this.holes = this.getHoles(positions);

        if (config && config.material) this.material = config.material;
        else this.material = Polygon.material;

        this.model = new THREE.Mesh(this.generateGeometry(positions), this.material);
        this.model.position.set(positions[0][0][0], positions[0][0][1], positions[0][0][2]);
        this.model.userData = this;

        this.surroundingLines = this.generateSurroundingLines(positions);
        for (let surroundingLine of this.surroundingLines) this.model.add(surroundingLine);
    }

    generateSurroundingLines(positions) {
        let surroundingLines = [];
        let localPositions = this.localizeVectors(positions);

        for (let positionSet of localPositions) {
            let flatPositions = [];

            for (let [x,y,z] of positionSet) flatPositions.push(x,y,z);
            flatPositions.push(positionSet[0][0], positionSet[0][1], positionSet[0][2]);

            let geometry = new LineGeometry();
            geometry.setPositions(flatPositions);
    
            let material = Polygon.lineMaterial;
    
            let model = new Line2( geometry, material );
            model.computeLineDistances();
            model.scale.set( 1, 1, 1 );

            model.userData.isPolygonSurroundingLine = true;
            model.userData.parent = this;
    
            surroundingLines.push(model);
        }

        return surroundingLines;
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

    fillHole(position) {
        for (let i=0; i < this.holes.length; i++) {
            let poly2 = turf.polygon([ [...this.holes[i], this.holes[i][0]] ]);
            if (booleanContains(poly2, turf.point(position))) this.holes.splice(i,1);
        }

        this.update();
    }

    carveHole(polygon) {
        let poly1 = null;

        let coords = [ [...this.vectors, this.vectors[0]] ];

        if (this.holes.length > 0) {
            for (let hole of this.holes) coords.push([...hole, hole[0]]);
        }

        poly1 = turf.polygon(coords);

        let poly2 = null;

        coords = [ [...polygon.vectors, polygon.vectors[0]] ];

        if (this.holes.length > 0) {
            for (let hole of polygon.holes) coords.push([...hole, hole[0]]);
        }

        poly2 = turf.polygon(coords);

        if (booleanContains(poly1, poly2)) {
            let diff = turf.difference(turf.featureCollection([poly1, poly2]));
            
            if (diff) {
                this.holes.push(polygon.vectors);
                this.update();
            }
        }
    }

    update() {
        let geometry = this.generateGeometry([this.vectors, ...this.holes]);

        this.model.geometry.dispose();
        this.model.geometry = geometry;
        this.model.position.set(this.vectors[0][0], this.vectors[0][1], this.vectors[0][2]);
        
        for (let surroundingLine of this.surroundingLines) surroundingLine.geometry.dispose();
        for (let surroundingLine of this.surroundingLines) this.model.remove(surroundingLine);

        this.surroundingLines = this.generateSurroundingLines([this.vectors, ...this.holes]);
        
        for (let surroundingLine of this.surroundingLines) this.model.add(surroundingLine);
    }
}