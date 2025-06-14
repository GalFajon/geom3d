import { Interaction } from './Interaction.js';
import { THREE, viewer } from '../misc/DependencyManager.js';
import { GeometryLayer } from '../layers/GeometryLayer.js';
import { Cursor } from '../Cursor.js';
import { View } from '../View.js';
import { Point } from '../geometry/Point.js';

export class Select extends Interaction {
    type = "Select";
    
    constructor(config) {
        super(config);

        this.raycaster = Cursor.raycaster;
        this.button = 0;
        this.highlight = true;

        if (config) {
            if (config.layer) this.parentSource = config.layer;
        }
        
        this.movedMouse = false;
        this.selectedObject = undefined;

        this.active = true;
    }

    addEventListeners() {
        if (this.parentSource instanceof GeometryLayer) {
            this.domElement.addEventListener('pointerup', this.handleGeometrySourcePointerUp2);
        }
        else {
            console.warn("The assigned source" + this.parentSource.type + " is incompatible with the interaction" + this.type + ".")
        }
    }

    remove() {
        if (this.parentSource instanceof GeometryLayer) {
            if (this.highlight && this.selectedObject) this.parentSource.removeGeometryHighlight(this.selectedObject);
            this.domElement.removeEventListener('pointerup', this.handleGeometrySourcePointerUp2);
        }
    }

    async initialize() {
        this.handleGeometrySourcePointerUp2 = this.handleGeometrySourcePointerUp.bind(this);
        this.addEventListeners();
    }

    setActive(active) {
        if (active == true) { this.active = true;}
        else { 
            if (this.highlight && this.selectedObject) this.parentSource.removeGeometryHighlight(this.selectedObject);
            this.selectedObject = undefined; 
            this.active = false; 
        }
    }

    handleGeometrySourcePointerUp(event) {    
        if (this.active) {            
            if (event.button == this.button) {
                if (View.cursor.movedMouse == false) {
                    let intersect = this.getMouseIntersect(event);

                    if (this.selectedObject) {
                        if (this.highlight) this.parentSource.removeGeometryHighlight(this.selectedObject);
                    }

                    if (intersect) {
                        this.selectedObject = intersect.object.userData;
                        if (this.highlight) this.parentSource.highlightGeometry(this.selectedObject);
                        const customEvent = new CustomEvent('selected', { detail: { geometry: this.selectedObject, clickPosition: intersect.point.toArray() } });
                        this.dispatchEvent(customEvent); 
                    }
                    else if (View.cursor.snappedObject && this.parentSource.geometries.includes(View.cursor.snappedObject)) {
                        this.selectedObject = View.cursor.snappedObject;
                        if (this.highlight) this.parentSource.highlightGeometry(this.selectedObject);
                        const customEvent = new CustomEvent('selected', { detail: { geometry: this.selectedObject, clickPosition: View.cursor.position } });
                        this.dispatchEvent(customEvent); 
                    }
                    else {
                        let id = View.getGpuPickIntersect(event, this.parentSource.gpuPickingScene);

                        if (id > 0) {
                            let geom = this.parentSource.gpuPointColorIds.get(id);

                            if (geom) {
                                this.selectedObject = geom;

                                if (this.highlight) this.parentSource.highlightGeometry(geom);
                                const customEvent = new CustomEvent('selected', { detail: { geometry: geom, clickPosition: View.cursor.position } });
                                this.dispatchEvent(customEvent); 
                            }
                        }
                    }
                }
            }
        }
    }

    getMouseIntersect(event, intersectChildren = true) {
        let intersects = [];
        let mouseCoords = new THREE.Vector2(
            ( event.layerX / this.domElement.getBoundingClientRect().width) * 2 - 1, // x
            -( event.layerY / this.domElement.getBoundingClientRect().height ) * 2 + 1 // y
        );

        let cursorPos = new THREE.Vector3(...View.cursor.position);

        this.raycaster.setFromCamera(mouseCoords, viewer.scene.getActiveCamera());
        
        if (this.parentSource.models) {
            intersects.push(...this.raycaster.intersectObjects( this.parentSource.models, intersectChildren ));
        }

        intersects.sort((first, second) => {
            let v1 = null;
            let v2 = null;

            if (first.object.userData instanceof Point) v1 = first.object.userData.vectors;
            else v1 = first.object.userData.vectors[0];

            if (second.object.userData instanceof Point) v2 = second.object.userData.vectors;
            else v2 = second.object.userData.vectors[0];

            (cursorPos.distanceTo(new THREE.Vector3(v1)) > cursorPos.distanceTo(new THREE.Vector3(v2))) ? 1 : -1
            
        });
        
        if (intersects.length > 0) return intersects[0];
    }

}