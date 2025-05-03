import { THREE, viewer } from "../misc/DependencyManager";
import { Layer } from "./Layer";

import { GLTFLoader } from '../three/gltf/GLTFLoader';

export class GLTFLayer extends Layer {
    visible = true;
    urls = [];
    models = [];
    attached = false;

    type = "GLTFLayer"

    static loader = new GLTFLoader();

    constructor(config) {
        super(config);

        if (config.urls) this.urls = config.urls;
    }

    async attach() {
        for (let url of this.urls) await this.add(url);
        this.attached = true;
    }

    detach() {
        for (let model of this.models) this.remove(model);
        
        this.models = [];
        this.attached = false;
    }

    async add(url) {
        let ref = this;

        return new Promise((resolve, reject) => {
            GLTFLayer.loader.load(
                url,
                function (gltf) {
                    ref.models.push(gltf.scene);
                    viewer.scene.scene.add(gltf.scene);
                    resolve();
                },
                function (xhr) { },
                function (error) {
                    console.log(error);
                    throw 'Error loading gltf.';
                }
            );
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
            for (let child of model.children) if (child.geometry && child.geometry.boundingBox) bbox.union(child.geometry.boundingBox);
        }

        return bbox.expandByScalar(0.05);
    }
}