import { viewer } from "../misc/DependencyManager.js";
import { CSS2DObject } from "../three/CSS2DRenderer.js";

export class Overlay {
    type = "Overlay"

    constructor([x, y, z], config) {
        this.vectors = [[x, y, z]];

        if (config.element) {
            this.model = new CSS2DObject(config.element);
            this.model.position.set(x, y, z);
            this.element = config.element;
            this.model.userData = this;
        }

        if (config.visibilityDistance) this.VisibilityDistance = config.visibilityDistance;
        if (config.clickable == false) this.element.style.pointerEvents = 'none';
    }

    attachToScene() {
        viewer.scene.scene.add(this.model);
    }

    removeFromScene() {
        viewer.scene.scene.remove(this.model);
    }

    updateVectors() {
        this.vectors = [[this.model.position.x, this.model.position.y, this.model.position.z]];
    }

    updateModel() {
        this.model.position.set(this.vectors[0][0], this.vectors[0][1], this.vectors[0][2]);
    }

    setPosition([x, y, z]) {
        this.vectors = [[x, y, z]];
        this.model.position.set(x, y, z);
    }
}