import { Interaction } from './Interaction.js';
import { THREE, viewer } from '../misc/DependencyManager.js';
import { Cursor } from '../Cursor.js';
import { View } from '../View.js';
import { Point } from '../geometry/Point.js';
import { GeometryLayer } from '../layers/GeometryLayer.js';
import { Line } from '../geometry/Line.js';
import { Polygon } from '../geometry/Polygon.js';

export class Modify extends Interaction {
    type = "Modify"

    constructor(config) {
        super(config);

        this.raycaster = Cursor.raycaster;
        this.button = 0;
        this.clickRange = 0.5;

        if (config) {
            if (config.layer) this.parentSource = config.layer;
            if (config.target) this.target = config.target;
            if (config.button) this.button = config.button;
            if (config.clickRange) this.clickRange = config.clickRange;
        }

        this.selectedVector = {
            index: undefined,
            coordinates: undefined,
            holeIndex: undefined
        };

        this.selectedObject = undefined;
        this.selectedMeasurement = undefined;
        this.active = true;
    }

    addEventListeners() {
        if (this.parentSource instanceof GeometryLayer) {
            this.domElement.addEventListener('pointerup', this.handleGeometrySourcePointerUp);
            this.domElement.addEventListener('mousemove', this.handleGeometrySourceMouseMove);
        }
        else {
            console.warn("The assigned source " + this.parentSource.type + " is incompatible with the interaction " + this.type + ".")
        }
    }

    removeEventListeners() {
        if (this.parentSource instanceof GeometryLayer) {
            this.domElement.removeEventListener('pointerup', this.handleGeometrySourcePointerUp);
            this.domElement.removeEventListener('mousemove', this.handleGeometrySourceMouseMove);
        }
    }

    initialize() {
        this.handleGeometrySourcePointerUp = this.handleGeometrySourcePointerUp.bind(this);
        this.handleGeometrySourceMouseMove = this.handleGeometrySourceMouseMove.bind(this);
        this.addEventListeners();
    }

    remove() {
        this.removeEventListeners();

        this.selectedObject = undefined;
        this.selectedMeasurement = undefined;
        this.selectedVector = {
            index: undefined,
            coordinates: undefined,
            holeIndex: undefined
        };
    }

    setActive(active) {
        if (active == true) {
            this.active = true;
        }
        else {
            this.active = false;
            this.remove();
        }
    }

    removeSelectedVertex() {
        if (this.selectedObject && this.selectedObject instanceof Line) {
            if (this.selectedObject.vectors.length > 2) {
                this.selectedObject.vectors.splice(this.selectedVector.index, 1);
                this.selectedObject.update();

                this.dispatchModifyEnd();
                this.clearSelection();
            }
        }
        if (this.selectedObject && this.selectedObject instanceof Polygon) {
            if (this.selectedObject.vectors.length > 3) {
                this.selectedObject.vectors.splice(this.selectedVector.index, 1);
                this.selectedObject.update();

                this.dispatchModifyEnd();
                this.clearSelection();
            }
        }
    }

    handleGeometrySourcePointerUp(event) {
        if (this.active) {
            this.handleGeometrySourceMouseMove();
            if (event.button == this.button) {
                if (View.cursor.movedMouse == false) {
                    let intersect = this.getMouseIntersect(event);

                    if (this.selectedObject && this.selectedVector.coordinates) {
                        this.dispatchModifyEnd();
                        this.clearSelection();
                    }
                    else if (intersect || View.cursor.snapped || this.target) {
                        if (this.target) this.selectedObject = this.target;
                        else if (this.parentSource.geometries.includes(View.cursor.snappedObject)) this.selectedObject = View.cursor.snappedObject;
                        else if (intersect) this.selectedObject = intersect.object.userData;

                        if (this.selectedObject) {
                            this.selectedObject.beingModified = true;
                            let cursorPos = new THREE.Vector3(...View.cursor.position);

                            let nearestCoordsv = [0, 0, 0];
                            let nearestDistv = null;
                            let nearestIndexv = 0;

                            if (this.selectedObject.vectors) {
                                if (this.selectedObject instanceof Point) {
                                    let [x, y, z] = this.selectedObject.vectors;

                                    if (cursorPos.distanceTo(new THREE.Vector3(x, y, z)) < nearestDistv || nearestDistv === null) {
                                        nearestDistv = cursorPos.distanceTo(new THREE.Vector3(x, y, z));
                                        nearestCoordsv = [x, y, z];
                                        nearestIndexv = 0;
                                    }

                                    if (nearestDistv < this.clickRange) this.selectedVector = { coordinates: nearestCoordsv, index: nearestIndexv, holeIndex: undefined };
                                }
                                else {
                                    for (let i = 0; i < this.selectedObject.vectors.length; i++) {
                                        let [x, y, z] = this.selectedObject.vectors[i];

                                        if (cursorPos.distanceTo(new THREE.Vector3(x, y, z)) < nearestDistv || nearestDistv === null) {
                                            nearestDistv = cursorPos.distanceTo(new THREE.Vector3(x, y, z));
                                            nearestCoordsv = [x, y, z];
                                            nearestIndexv = i;
                                        }
                                    }

                                    if (nearestDistv < this.clickRange) this.selectedVector = { coordinates: nearestCoordsv, index: nearestIndexv, holeIndex: undefined };
                                }
                            }

                            if (this.selectedObject.holes) {
                                for (let i = 0; i < this.selectedObject.holes.length; i++) {
                                    let nearestCoords = [0, 0, 0];
                                    let nearestDist = null;
                                    let nearestIndex = 0;

                                    for (let j = 0; j < this.selectedObject.holes[i].length; j++) {
                                        let [x, y, z] = this.selectedObject.holes[i][j];

                                        if (cursorPos.distanceTo(new THREE.Vector3(x, y, z)) < nearestDist || nearestDist === null) {
                                            nearestDist = cursorPos.distanceTo(new THREE.Vector3(x, y, z));
                                            nearestCoords = [x, y, z];
                                            nearestIndex = j;
                                        }
                                    }

                                    if (nearestDist < this.clickRange && (!nearestDistv || nearestDist < nearestDistv)) this.selectedVector = { coordinates: nearestCoords, index: nearestIndex, holeIndex: i };
                                }
                            }

                            if (!this.selectedVector.index && !this.selectedVector.coordinates && !this.selectedVector.holeIndex && (intersect || (View.cursor.snapped && View.cursor.snappedObject == this.selectedObject))) {
                                let point;

                                if (intersect && intersect.point) point = intersect.point
                                else point = new THREE.Vector3(...View.cursor.mousePosition);

                                if ((this.selectedObject instanceof Line || this.selectedObject instanceof Polygon) && this.selectedObject.vectors) {
                                    for (let i = 1; i < this.selectedObject.vectors.length; i++) {
                                        if (this.vectorIsOnLine(this.selectedObject.vectors[i - 1], this.selectedObject.vectors[i], point.toArray())) {
                                            this.selectedObject.vectors.splice(i, 0, point.toArray());
                                            this.selectedObject.update();

                                            this.selectedVector = {
                                                index: i,
                                                coordinates: point.toArray(),
                                                holeIndex: undefined
                                            }

                                            break;
                                        }
                                    }

                                    if (this.selectedObject.holes) {
                                        for (let i = 0; i < this.selectedObject.holes.length; i++) {
                                            for (let j = 1; j < this.selectedObject.holes[i].length; j++) {
                                                if (this.vectorIsOnLine(this.selectedObject.holes[i][j - 1], this.selectedObject.holes[i][j], point.toArray())) {
                                                    this.selectedObject.holes[i].splice(j, 0, point.toArray());
                                                    this.selectedObject.update();

                                                    this.selectedVector = {
                                                        index: j,
                                                        coordinates: point.toArray(),
                                                        holeIndex: i
                                                    }

                                                    break;
                                                }
                                            }
                                        }
                                    }

                                    if (this.selectedObject instanceof Polygon && this.selectedObject.vectors.length > 1) {
                                        if (this.vectorIsOnLine(this.selectedObject.vectors[0], this.selectedObject.vectors[this.selectedObject.vectors.length - 1], point.toArray())) {
                                            this.selectedObject.vectors.splice(this.selectedObject.vectors.length, 0, point.toArray());
                                            this.selectedObject.update();

                                            this.selectedVector = {
                                                index: this.selectedObject.vectors.length - 1,
                                                coordinates: point.toArray(),
                                                holeIndex: undefined
                                            }
                                        }
                                    }
                                }
                            }

                            this.dispatchModifyStart();
                        }
                    }
                    else {
                        this.clearSelection();
                    }
                }
            }
        }
    }

    vectorIsOnLine(a, b, c) {
        let curVec = new THREE.Vector3(...a);
        let prevVec = new THREE.Vector3(...b);
        let lineVec = new THREE.Vector3(...c);

        if (Math.floor(curVec.distanceTo(lineVec) + prevVec.distanceTo(lineVec)) == Math.floor(prevVec.distanceTo(curVec))) return true;
        else return false;
    }

    handleGeometrySourceMouseMove() {
        if (this.active) {
            if (this.selectedObject) this.selectedObject.beingModified = true;
            if (this.selectedVector.coordinates != undefined && this.selectedVector.index != undefined) {
                if (this.selectedVector.holeIndex == undefined) {
                    this.selectedVector.coordinates = View.cursor.position;

                    if (this.selectedObject instanceof Point) this.selectedObject.vectors = this.selectedVector.coordinates;
                    else this.selectedObject.vectors[this.selectedVector.index] = this.selectedVector.coordinates;
                }
                else {
                    this.selectedVector.coordinates = View.cursor.position;
                    this.selectedObject.holes[this.selectedVector.holeIndex][this.selectedVector.index] = this.selectedVector.coordinates;
                }

                if (!(this.selectedObject instanceof Point)) this.selectedObject.update();
                else this.parentSource.updatePoints();
            }
        }
    }

    clearSelection() {
        if (this.selectedVector) {
            this.selectedVector = {
                coordinates: undefined,
                index: undefined,
                holeIndex: undefined
            }
        };

        if (this.selectedObject) {
            this.selectedObject.beingModified = false;
            this.selectedObject = undefined;
        }

        if (this.selectedMeasurement) this.selectedMeasurement = undefined;
    }

    getMouseIntersect(event) {
        let intersects = [];
        let mouseCoords = new THREE.Vector2(
            (event.layerX / this.domElement.getBoundingClientRect().width) * 2 - 1, // x
            -(event.layerY / this.domElement.getBoundingClientRect().height) * 2 + 1 // y
        );

        this.raycaster.setFromCamera(mouseCoords, viewer.scene.getActiveCamera());

        if (this.parentSource.models) {
            intersects.push(...this.raycaster.intersectObjects(this.parentSource.models, true));
        }
        if (this.parentSource instanceof GeometryLayer && this.parentSource.pointscloud) {
            for (let [key,value] of this.parentSource.pointscloud.entries()) {
                if (this.parentSource.pointscloud[key] && this.parentSource.points[key].length > 0) {
                    let pointIntersects = this.raycaster.intersectObject(this.parentSource.pointscloud[key], true);
                    for (let intersect of pointIntersects) {
                        intersects.push({ object: { userData: this.parentSource.points[intersect.index] }, point: intersect.point, distance: intersect.distance });
                    }
                }
            }
        }

        intersects.sort((first, second) => (first.distance > second.distance) ? 1 : -1)
        return intersects[0];
    }

    dispatchModifyStart() {
        const customEvent = new CustomEvent('modifystart', {
            detail: {
                object: this.selectedObject,
                measurement: this.selectedMeasurement,
                editedVector: this.selectedVector,
                source: this.parentSource
            }
        });

        this.dispatchEvent(customEvent);
        this.parentSource.dispatchEvent(customEvent);
    }

    dispatchModifyEnd() {
        const customEvent = new CustomEvent('modifyend', {
            detail: {
                object: this.selectedObject,
                measurement: this.selectedMeasurement,
                editedVector: this.selectedVector,
                source: this.parentSource
            }
        });

        this.dispatchEvent(customEvent);
        this.parentSource.dispatchEvent(customEvent);
    }
}