import { Line } from "../geometry/Line";
import { Polygon } from "../geometry/Polygon";
import { Point } from "../geometry/Point";

import { THREE, viewer } from "../misc/DependencyManager";
import { Layer } from "./Layer";

export class GeometryLayer extends Layer {
    visible = true;

    geometries = [];
    models = [];

    points = []
    // TODO: maybe make the point a nice round image?
    pointscloud = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: '#C41E3A', size: 0.5, sizeAttenuation: true }));
    pointvertices = []

    constructor(config) {
        super();

        this.geometries = config.geometries;
        for (let geometry of this.geometries) this.add(geometry);

        this.updatePoints();

        this.type = 'GeometryLayer';
    }

    updatePoints() {
        this.pointvertices = [];
        this.points = [];

        let rootCoords = [];
        let first = true;

        for (let geometry of this.geometries) {
            if (geometry.type == 'Point') {
                if (first == true) {
                    rootCoords = geometry.vectors;
                    first = false;
                }

                let relativeCoords = [geometry.vectors[0] - rootCoords[0], geometry.vectors[1] - rootCoords[1], geometry.vectors[2] - rootCoords[2]];

                this.points.push(geometry);
                this.pointvertices.push(...relativeCoords);
            }
        }

        viewer.scene.scene.remove(this.pointscloud);

        if (this.pointvertices.length > 0) {
            this.pointscloud.geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.pointvertices, 3));
            this.pointscloud.geometry.setDrawRange(0, this.pointvertices.length);
            this.pointscloud.geometry.verticesNeedUpdate = true;
            this.pointscloud.geometry.computeBoundingSphere();
            this.pointscloud.position.set(...rootCoords);
            viewer.scene.scene.add(this.pointscloud);
        }
        else {
            this.pointscloud.geometry.dispose();
            this.pointscloud.material.dispose();
        }
    }

    async attach() {
        for (let geometry of this.geometries) this.add(geometry);
        this.attached = true;
    }

    detach() {
        for (let geometry of this.geometries) this.remove(geometry);
        this.attached = false;
    }

    add(geometry) {
        if (this.attached) this.geometries.push(geometry);

        if (geometry instanceof Line || geometry instanceof Polygon) {
            this.models.push(geometry.model);
            viewer.scene.scene.add(geometry.model);
        }
        else if (geometry instanceof Point) {
            this.points.push(geometry);
            this.updatePoints();
        }
    }

    remove(geometry) {
        if (
            (geometry instanceof Line || geometry instanceof Polygon) &&
            this.geometries.indexOf(geometry) > -1
        ) {
            let i = this.geometries.indexOf(geometry);

            viewer.scene.scene.remove(this.models[i]);

            this.models.splice(i, 1);
            this.geometries.splice(i, 1);
        }
    }

    updateVisibility() {
        for (let models of this.models) models.visible = this.visible;
    }

    show() {
        this.visible = true;
        this.updateVisibility();
    }

    hide() {
        this.visible = false;
        this.updateVisibility();
    }

    bbox() {
        let bbox = new THREE.Box3();

        for (let geometry of this.geometries) {
            for (let vector of geometry.vectors) {
                bbox.expandByPoint(new THREE.Vector3(vector));
            }
        }

        return bbox;
    }
}