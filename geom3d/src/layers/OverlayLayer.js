import { THREE } from "../misc/DependencyManager";
import { Layer } from "./Layer";

export class OverlayLayer extends Layer {
    overlays = []
    models = []
    UseVisibilityDistance = true

    constructor(config) {
        super();

        if (config) {
            if (config.overlays) this.overlays = config.overlays;
        }
    }

    async attach() {
        for (let overlay of this.overlays) this.add(overlay, false);
    }

    detach() {
        for (let overlay of this.overlays) this.remove(overlay);
    }

    async add(overlay, addToArray = true) {
        if (addToArray) this.overlays.push(overlay);
        overlay.attachToScene();
        this.models.push(overlay.model);
        this.updateVisibility();
    }

    remove(overlay) {
        overlay.removeFromScene();
        if (this.overlays.indexOf(overlay) != -1) this.overlays.splice(this.overlays.indexOf(overlay), 1);
        if (this.models.indexOf(overlay.model) != -1) this.models.splice(this.models.indexOf(overlay.model), 1);
    }

    updateVisibility() {
        for (let model of this.models) model.visible = this.visible;
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

        for (let overlay of this.overlays) {
            for (let vector of overlay.vectors) {
                bbox.expandByPoint(new THREE.Vector3(...vector));
            }
        }

        return bbox;
    }
}
