import { Interaction } from './Interaction.js';
import { SnapLine } from './helpers/SnapLine.js';
import { THREE, viewer } from '../misc/DependencyManager.js';
import { GeometryLayer } from '../layers/GeometryLayer.js';
import { Point } from '../geometry/Point.js';
import { Polygon } from '../geometry/Polygon.js';
import { Line } from '../geometry/Line.js';

export class Snap extends Interaction {
    type = "Snap"
    static pointMaterial = new THREE.PointsMaterial({ color: '#282828', size: 0.1, transparent: true, opacity: 0 });

    constructor(config) {
        super(config);

        this.parentSources = [];

        if (config) {
            if (config.layers) this.parentSources = config.layers;
            if (config.target) this.target = config.target;
        }

        this.snapPoints = [];
        
        this.snapPointCloud = new THREE.Points(new THREE.BufferGeometry(), Snap.pointMaterial);
        this.snapPointCloudPositions = [];
        this.snapPointCloudReferences = [];
        this.snapPointCloudRoot = [];

        this.snapPotreePointclouds = [];
        this.snapLines = [];

        this.models = [];

        this.active = true;
    }

    initialize() {
        this.generateSnaps2 = this.generateSnaps.bind(this);
        viewer.scene.scene.add(this.snapPointCloud);
        this.snapPointCloud.visible = false;

        this.addEventListeners();
        this.generateSnaps();
    }

    addEventListeners() {
        for (let source of this.parentSources) {
            if (source instanceof GeometryLayer) {
                source.addEventListener('modifyend', this.generateSnaps2);
                source.addEventListener('added', this.generateSnaps2);
                source.addEventListener('removed', this.generateSnaps2);
            }
        }
    }

    remove() {
        for (let source of this.parentSources) {
            if (source instanceof GeometryLayer) {
                source.removeEventListener('modifyend', this.generateSnaps2);
                source.removeEventListener('added', this.generateSnaps2);
                source.removeEventListener('removed', this.generateSnaps2);
            }
        }

        this.clearSnapPoints();
        this.clearSnapLines();
    }

    setActive(active) {
        if (active == true) { this.active = true; this.generateSnaps(); this.addEventListeners(); }
        else { this.active = false; this.remove(); }
    }

    generateSnaps() {
        this.snapPointCloudPositions = [];
        this.snapPointCloudReferences = [];
        this.snapPointCloudRoot = [];
        
        this.clearSnapLines();
        this.clearSnapPoints();

        let geometriesToSnapTo = [];

        if (this.target) geometriesToSnapTo.push(this.target);
        else {
            for (let source of this.parentSources) {
                if (source instanceof GeometryLayer) geometriesToSnapTo.push(...source.geometries);
            }
        }

        if (geometriesToSnapTo.length > 0) {
            let first = true;

            for (let geometry of geometriesToSnapTo) {
                if (geometry instanceof Point) {
                    if (first) this.snapPointCloudRoot = geometriesToSnapTo[0].vectors;

                    this.snapPointCloudPositions.push(geometry.vectors[0] - this.snapPointCloudRoot[0], geometry.vectors[1] - this.snapPointCloudRoot[1], geometry.vectors[2] - this.snapPointCloudRoot[2]);
                    this.snapPointCloudReferences.push(geometry);
                }
                if (geometry instanceof Polygon) {
                    if (first) this.snapPointCloudRoot = geometriesToSnapTo[0].vectors[0];

                    for (let vector of geometry.vectors) {
                        this.snapPointCloudPositions.push(vector[0] - this.snapPointCloudRoot[0], vector[1] - this.snapPointCloudRoot[1], vector[2] - this.snapPointCloudRoot[2]);
                        this.snapPointCloudReferences.push(geometry);
                    }

                    for (let hole of geometry.holes) {
                        this.createSnapLine([...hole, hole[0]], geometry);

                        for (let holePosition of hole) {
                            this.snapPointCloudPositions.push(holePosition[0] - this.snapPointCloudRoot[0], holePosition[1] - this.snapPointCloudRoot[1], holePosition[2] - this.snapPointCloudRoot[2]);
                            this.snapPointCloudReferences.push(geometry);
                        }
                    }

                    this.createSnapLine([...geometry.vectors, geometry.vectors[0]], geometry);
                }
                if (geometry instanceof Line) {
                    if (first) this.snapPointCloudRoot = geometriesToSnapTo[0].vectors[0];

                    this.createSnapLine(geometry.vectors, geometry);

                    for (let vector of geometry.vectors) {
                        this.snapPointCloudPositions.push(vector[0] - this.snapPointCloudRoot[0], vector[1] - this.snapPointCloudRoot[1], vector[2] - this.snapPointCloudRoot[2]);
                        this.snapPointCloudReferences.push(geometry);
                    }
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

    updateSnapPointHelper() {
        if (this.snapPointCloudPositions.length > 0) {
            this.snapPointCloud.geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.snapPointCloudPositions, 3));
            this.snapPointCloud.geometry.setDrawRange(0, this.snapPointCloudPositions.length);
            this.snapPointCloud.geometry.verticesNeedUpdate = true;
            this.snapPointCloud.geometry.computeBoundingSphere();
            this.snapPointCloud.position.set(this.snapPointCloudRoot[0],this.snapPointCloudRoot[1],this.snapPointCloudRoot[2]);
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