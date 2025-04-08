import { Interaction } from './Interaction.js';
import { SnapLine } from './helpers/SnapLine.js';
import { THREE, viewer } from '../misc/DependencyManager.js';
import { GeometryLayer } from '../layers/GeometryLayer.js';
import { Point } from '../geometry/Point.js';
import { Polygon } from '../geometry/Polygon.js';
import { Line } from '../geometry/Line.js';

export class Snap extends Interaction {
    static pointMaterial = new THREE.PointsMaterial({ color: '#282828', size: 0.1, transparent: true, opacity: 0 });

    constructor(config) {
        super(config);

        this.parentSources = [];

        if (config) {
            if (config.sources) this.parentSources = config.sources;
            if (config.target) this.target = config.target;
        }

        this.snapPoints = [];
        this.snapPointCloud = new THREE.Points(new THREE.BufferGeometry(), Snap.pointMaterial);
        this.snapPotreePointclouds = [];
        this.snapLines = [];

        this.models = [];

        this.active = true;
    }

    initialize() {
        this.generateSnaps2 = this.generateSnaps.bind(this);
        viewer.scene.scene.add(this.snapPointCloud);

        for (let source of this.parentSources) {
            if (source instanceof GeometryLayer) {
                source.addEventListener('modifyend', this.generateSnaps2);
                source.addEventListener('added', this.generateSnaps2);
                source.addEventListener('removed', this.generateSnaps2);
            }
        }

        this.generateSnaps();
    }

    remove() {
        this.clearSnapPoints();
        this.clearSnapLines();
    }

    setActive(active) {
        if (active == true) { this.active = true; this.generateSnaps(); }
        else { this.active = false; this.remove(); }
    }

    generateSnaps() {
        this.clearSnapLines();
        this.clearSnapPoints();

        let geometriesToSnapTo = [];

        if (this.target) geometriesToSnapTo.push(this.target);
        else {
            for (let source of this.parentSources) {
                if (source instanceof GeometryLayer) geometriesToSnapTo.push(...source.geometries);
            }
        }

        for (let geometry of geometriesToSnapTo) {
            if (geometry instanceof Point) {
                this.createSnapPoint(geometry.vectors, geometry)
            }
            if (geometry instanceof Polygon) {
                for (let vector of geometry.vectors) this.createSnapPoint(vector, geometry);

                for (let hole of geometry.holes) {
                    this.createSnapLine([...hole, hole[0]], geometry);

                    for (let holePosition of hole) {
                        this.createSnapPoint(holePosition, geometry);
                    }
                }

                this.createSnapLine([...geometry.vectors, geometry.vectors[0]], geometry);
            }
            if (geometry instanceof Line) {
                this.createSnapLine(geometry.vectors, geometry);

                for (let vector of geometry.vectors) {
                    this.createSnapPoint(vector, geometry);
                }
            }
        }

        this.updateSnapPointHelper();
    }

    clearSnapPoints() {
        this.snapPointCloud.geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
        this.snapPointCloud.geometry.setDrawRange(0, 0);
        this.snapPointCloud.geometry.verticesNeedUpdate = true;
        this.snapPointCloud.geometry.computeBoundingSphere();
        this.snapPoints = [];
    }

    clearSnapLines() {
        for (let snapLine of this.snapLines) {
            snapLine.removeFromScene();
            if (this.models.indexOf(snapLine.model) > -1) this.models.splice(this.models.indexOf(snapLine.model), 1);
        }

        this.snapLines = [];
    }

    createSnapPoint([x, y, z], referencedObject) {
        this.snapPoints.push({ coordinates: [x, y, z], refersTo: referencedObject });
    }

    updateSnapPointHelper() {
        if (this.snapPoints[0] && this.snapPoints[0].coordinates) {
            let root = this.snapPoints[0].coordinates;
            let flat = [];
            for (let point of this.snapPoints) flat.push(point.coordinates[0] - root[0], point.coordinates[1] - root[1], point.coordinates[2] - root[2]);

            this.snapPointCloud.geometry.setAttribute('position', new THREE.Float32BufferAttribute(flat, 3));
            this.snapPointCloud.geometry.setDrawRange(0, this.snapPoints.length);
            this.snapPointCloud.geometry.verticesNeedUpdate = true;
            this.snapPointCloud.geometry.computeBoundingSphere();
            this.snapPointCloud.position.set(...root);
        }
    }

    createSnapLine(positions, referencedObject) {
        let snapLine = new SnapLine(positions, referencedObject);
        snapLine.attachToScene();

        this.snapLines.push(snapLine);
        this.models.push(snapLine.model);
        return snapLine;
    }
}