import { THREE, viewer } from '../misc/DependencyManager.js';

import { Interaction } from './Interaction.js';
import { DrawHelper } from './helpers/DrawHelper.js';

import { Line } from '../geometry/Line.js';
import { Point } from '../geometry/Point.js';
import { Polygon } from '../geometry/Polygon.js';
import { Cursor } from '../Cursor.js';
import { View } from '../View.js';
import { GeometryLayer } from '../layers/GeometryLayer.js';

export class Draw extends Interaction {
    type = "Draw"

    constructor(config) {
        super(config);

        if (config) {
            if (config.layer) this.parentSource = config.layer;
            if (config.type) {
                this.geomType = config.type;
                this.drawHelper = new DrawHelper({ geomType: config.type });
            }
            else throw "Draw interaction must have 'type' parameter.";

            if (config.maxVertices) this.maxVertices = config.maxVertices;
            else this.maxVertices = Infinity;
        }

        this.raycaster = Cursor.raycaster;

        this.vectors = [];

        this.active = true;
    }

    addEventListeners() {
        if (!this.parentSource) {
            throw 'Must have parameter layer.';
        }
        else if (this.parentSource instanceof GeometryLayer) {
            this.domElement.addEventListener('pointerup', this.handleGeometrySourcePointerUp2);
        }
        else {
            console.warn("The assigned source " + this.parentSource.type + " is incompatible with the interaction " + this.type + ".")
        }
    }

    removeEventListeners() {
        if (this.parentSource instanceof GeometryLayer) {
            this.domElement.removeEventListener('pointerup', this.handleGeometrySourcePointerUp2);
        }
    }

    initialize() {
        this.handleGeometrySourcePointerUp2 = this.handleGeometrySourcePointerUp.bind(this);

        this.addEventListeners();
    }

    remove() {
        this.removeEventListeners();
        if (this.drawHelper) this.drawHelper.clear();
    }

    setActive(active) {
        if (active == true) { this.active = true; this.addEventListeners(); }
        else { this.active = false; this.remove(); }
    }

    handleGeometrySourcePointerUp(event) {
        if (this.active) {
            if (event.button == 0) {
                let intersect = this.getMouseIntersect(event);

                if (
                    View.cursor.movedMouse == false &&
                    this.vectors.length < this.maxVertices
                ) {
                    if (this.drawHelper) {
                        this.vectors.push(View.cursor.position);
                        this.drawHelper.addVector(View.cursor.position);
                        this.dispatchVertexAdded({ vertex: JSON.parse(JSON.stringify(View.cursor.position)), index: this.drawHelper.Vectors.length - 1 });
                    }
                }
            }

            else if (event.button == 2) {
                this.vectors = [];

                if (this.drawHelper && !View.cursor.movedMouse) {
                    let drawnGeometry = undefined;

                    if (this.geomType == "Point" && this.drawHelper.Vectors.length > 0) {
                        let points = [];

                        for (let vector of this.drawHelper.Vectors) {
                            points.push(new Point(vector));
                        }

                        drawnGeometry = points;
                    }
                    else if (this.geomType == "Line" && this.drawHelper.Vectors.length >= 2) {
                        drawnGeometry = new Line(this.drawHelper.Vectors);
                    }
                    else if (this.geomType == "Polygon" && this.drawHelper.Vectors.length >= 3) {
                        drawnGeometry = new Polygon([this.drawHelper.Vectors]);
                    }

                    if (drawnGeometry) this.dispatchDrawEnd(drawnGeometry);
                    this.drawHelper.clear();
                }
            }
        }
    }

    getMouseIntersect(event) {
        let mouseCoords = new THREE.Vector2(
            (event.layerX / this.domElement.getBoundingClientRect().width) * 2 - 1, // x
            -(event.layerY / this.domElement.getBoundingClientRect().height) * 2 + 1 // y
        );

        const raycastList = [];
        viewer.scene.scene.traverse(c => { if (c.visible == true && c.type != 'AxesHelper' && c.userData.Type != 'Cursor3D' && !c.userData.beingModified) { raycastList.push(c); } });

        this.raycaster.setFromCamera(mouseCoords, viewer.scene.getActiveCamera());

        let intersects = this.raycaster.intersectObjects(raycastList, false);
        intersects.sort((first, second) => (first.distance > second.distance) ? 1 : -1)

        return intersects[0];
    }

    dispatchVertexAdded(detail) {
        const customEvent = new CustomEvent('vertexadded', { detail: detail, source: this.parentSource });
        this.dispatchEvent(customEvent);
    }

    undo(index) {
        if (this.active) {
            if (this.parentSource instanceof GeometrySource) {
                this.vectors.pop(View.cursor.position);
                if (this.drawHelper) this.drawHelper.undo(index);

                this.parentSource.updatePoints();
            }
        }
    }

    dispatchDrawEnd(detail) {
        const customEvent = new CustomEvent('drawend', { detail: detail, source: this.parentSource });
        this.dispatchEvent(customEvent);
        this.parentSource.dispatchEvent(customEvent);
    }
}