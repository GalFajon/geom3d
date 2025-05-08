import { THREE, viewer } from "../misc/DependencyManager";
import { Layer } from "./Layer";

import * as OBC from "@thatopen/components";

const components = new OBC.Components();

export class IFCLayer extends Layer {
    static outlineMaterial = new THREE.LineBasicMaterial( { color: 0x000000 } );

    visible = true;
    urls = [];
    models = [];
    outlines = [];
    attached = false;

    type = "IFCLayer"

    fragments = components.get(OBC.FragmentsManager);
    fragmentIfcLoader = components.get(OBC.IfcLoader);

    constructor(config) {
        super(config);

        if (config.urls) this.urls = config.urls;
    }

    async attach() {
        await this.fragmentIfcLoader.setup();
        this.fragmentIfcLoader.settings.wasm = {
            path: "/",
            absolute: false,
        };

        this.fragmentIfcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = true;

        for (let url of this.urls) await this.add(url);
        this.attached = true;
    }

    detach() {
        for (let model of this.models) this.remove(model);
        
        this.models = [];
        this.attached = false;
    }

    // why does the model clip weirdly?
    correctModelAxis(model) {
        let offset = (new THREE.Vector3()).setFromMatrixPosition(model.coordinationMatrix);

        model.position.set(-offset.x, offset.z, -offset.y);
        model.rotation.x = Math.PI / 2;
    }

    add(url) {
        return new Promise(async (resolve, reject) => {
            const file = await fetch(url);
            const data = await file.arrayBuffer();
            const buffer = new Uint8Array(data);
            const model = await this.fragmentIfcLoader.load(buffer);

            this.correctModelAxis(model);

            this.models.push(model);
            viewer.scene.scene.add(model);

            resolve();
        })
    }

    remove(model, removeFromArray = true) {
        viewer.scene.scene.remove(model)

        if (this.models.indexOf(model) > -1) {
            let i = this.models.indexOf(model);

            for (let outline of this.outlines[i]) viewer.scene.scene.remove(outline);

            if (removeFromArray) {
                this.outlines.splice(i, 1);
                this.models.splice(i, 1);
                this.urls.splice(i, 1);
            }
        }
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

        for (let model of this.models) {
            let modelBbox = new THREE.Box3();

            for (let child of model.children) {
                modelBbox.union(child.geometry.boundingBox);
            }

            modelBbox.translate(model.position);
            bbox.union(modelBbox);
        }

        return bbox.expandByScalar(0.05);
    }
}