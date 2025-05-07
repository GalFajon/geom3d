import { THREE, viewer } from "../misc/DependencyManager";
import { Layer } from "./Layer";

import * as OBC from "@thatopen/components";

const components = new OBC.Components();

export class IFCLayer extends Layer {
    visible = true;
    urls = [];
    models = [];
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
            path: "https://unpkg.com/web-ifc@0.0.66/",
            absolute: true,
        };

        for (let url of this.urls) await this.add(url);
        this.attached = true;
    }

    detach() {
        for (let model of this.models) this.remove(model);
        
        this.models = [];
        this.attached = false;
    }

    async add(url) {
        return new Promise(async (resolve, reject) => {
            const file = await fetch(url);
            const data = await file.arrayBuffer();
            const buffer = new Uint8Array(data);
            const model = await this.fragmentIfcLoader.load(buffer);
            
            model.rotation.x = Math.PI / 2;

            this.models.push(model);
            viewer.scene.scene.add(model);
        })
    }

    remove(model, removeFromArray = true) {
        viewer.scene.remove(model)

        if (this.models.indexOf(model) > -1) {
            let i = this.models.indexOf(model);

            if (removeFromArray) {
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
            for (let child of model.children) {
                bbox.union(child.geometry.boundingBox);
            }
        }

        return bbox.expandByScalar(0.05);
    }
}