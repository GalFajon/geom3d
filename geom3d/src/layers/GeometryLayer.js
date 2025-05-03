import { Line } from "../geometry/Line";
import { Polygon } from "../geometry/Polygon";
import { Point } from "../geometry/Point";

import { THREE, viewer } from "../misc/DependencyManager";
import { Layer } from "./Layer";
import { LineMaterial } from '../three/fatlines/LineMaterial.js'

export class GeometryLayer extends Layer {
    static meshSelectionMaterial = new THREE.MeshBasicMaterial( {color: 'lightgreen', side: THREE.DoubleSide, transparent: false } );
    static lineSelectionMaterial = new LineMaterial( { color: 'lightgreen', linewidth: 5, vertexColors: false, resolution: new THREE.Vector2(1000, 1000), dashed: false, alphaToCoverage: true });
    
    static pointMaterial = new THREE.PointsMaterial({ color: '#C41E3A', size: 0.5, sizeAttenuation: true });
    static selectedPointMaterial = new THREE.PointsMaterial({ color: 'lightgreen', size: 0.5, sizeAttenuation: true });

    visible = true;
    geometries = [];
    models = [];
    highlight = true;

    points = new Map()
    pointscloud = new Map()
    pointvertices = new Map()

    type = "GeometryLayer"

    constructor(config) {
        super(config);

        this.points.set('default', []);
        this.points.set('highlighted', []);

        this.pointscloud.set('default', new THREE.Points(new THREE.BufferGeometry(), GeometryLayer.pointMaterial));
        this.pointscloud.set('highlighted', new THREE.Points(new THREE.BufferGeometry(), GeometryLayer.selectedPointMaterial));

        this.pointvertices.set('default', []);
        this.pointvertices.set('highlighted', []);

        this.geometries = config.geometries;
    }

    updatePoints() {
        this.pointvertices.set('default', []);
        this.pointvertices.set('highlighted', []);

        this.points.set('default', []);
        this.points.set('highlighted', []);

        let rootCoords = [];
        let first = true;

        for (let geometry of this.geometries) {
            if (geometry instanceof Point) {
                if (first == true) {
                    rootCoords = geometry.vectors;
                    first = false;
                }

                let relativeCoords = [geometry.vectors[0] - rootCoords[0], geometry.vectors[1] - rootCoords[1], geometry.vectors[2] - rootCoords[2]];

                if (geometry.highlighted) {
                    this.points.get('highlighted').push(geometry);
                    this.pointvertices.get('highlighted').push(...relativeCoords);
                }
                else {
                    this.points.get('default').push(geometry);
                    this.pointvertices.get('default').push(...relativeCoords);
                }
            }
        }

        for (const [key, value] of this.pointscloud) {
            viewer.scene.scene.remove(value);

            if (this.pointvertices.get(key).length > 0) {
                value.geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.pointvertices.get(key), 3));
                value.geometry.setDrawRange(0, this.pointvertices.get(key).length);
                value.geometry.verticesNeedUpdate = true;
                value.geometry.computeBoundingSphere();
                value.position.set(...rootCoords);
                viewer.scene.scene.add(value);
            }
            else {
                value.geometry.dispose();
                value.material.dispose();
            }
        }
    }

    async attach() {
        for (let geometry of this.geometries) this.add(geometry);
        this.attached = true;
    }

    detach() {
        for (let geometry of this.geometries) this.remove(geometry, false);

        this.geometries = [];

        this.updatePoints();
        this.attached = false;
    }

    highlightGeometry(geometry) {
        if (geometry instanceof Line) {
            geometry.model.material = GeometryLayer.lineSelectionMaterial;
        }
        else if(geometry instanceof Point) {
            geometry.highlighted = true;
            this.updatePoints();
        }
        else if (geometry instanceof Polygon) geometry.model.material = GeometryLayer.meshSelectionMaterial;
    }

    removeGeometryHighlight(geometry) {
        if (geometry) {
            if (geometry instanceof Line) {
                geometry.model.material = Line.material;
            }
            else if (geometry instanceof Point) {
                geometry.highlighted = false;
                this.updatePoints();
            }
            else if (geometry instanceof Polygon) {
                geometry.model.material = Polygon.material;
            }
        }
    }

    add(geometry) {
        if (this.attached) this.geometries.push(geometry);

        if (geometry instanceof Line || geometry instanceof Polygon) {
            this.models.push(geometry.model);
            viewer.scene.scene.add(geometry.model);
        }
        else if (geometry instanceof Point) {
            if (geometry.highlighted) this.points.get('highlighted').push(geometry);
            else this.points.get('default').push(geometry);

            this.updatePoints();
        }

        const customEvent = new CustomEvent('added', { detail: { source: this, geometry: geometry } });
        this.dispatchEvent(customEvent);
    }

    remove(geometry, removeFromArray = true) {        
        if (
            this.geometries.indexOf(geometry) > -1
        ) {
            let i = this.geometries.indexOf(geometry);
            
            if (geometry instanceof Line || geometry instanceof Polygon) {
                viewer.scene.scene.remove(geometry.model);
            }

            if (removeFromArray) {
                if (this.models.indexOf(geometry.model) > -1) this.models.splice( this.models.indexOf(geometry.model), 1);
                this.geometries.splice(i, 1);
            }
        }

        if (geometry instanceof Point && removeFromArray) this.updatePoints();

        const customEvent = new CustomEvent('removed', { detail: { source: this, geometry: geometry } });
        this.dispatchEvent(customEvent);
    }

    updateVisibility() {
        for (let models of this.models) models.visible = this.visible;
        for (let pointscloud of this.pointscloud.values()) pointscloud.visible = this.visible;
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
            if (geometry instanceof Line) {
                for (let vector of geometry.vectors) {
                    bbox.expandByPoint(new THREE.Vector3(...vector));
                }
            }
            else if (geometry instanceof Polygon) {
                for (let vector of geometry.vectors) {
                    bbox.expandByPoint(new THREE.Vector3(...vector));
                }
            }
            else if (geometry instanceof Point) {
                bbox.expandByPoint(new THREE.Vector3(...geometry.vectors));
            }
        }

        return bbox;
    }
}