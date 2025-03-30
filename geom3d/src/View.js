import { THREE, viewer } from "./misc/DependencyManager";

export class View {
    layers = [];

    constructor(config) {
        if (config.layers) this.layers = config.layers;
    }

    async initialize() {
        for (let layer of this.layers) await layer.attach();
    }

    async addLayer(layer) {
        this.layers.push(layer);
        await layer.attach();
    }

    removeLayer(layer) {
        if (this.layers.indexOf(layer) > -1) {
            let i = this.layers.indexOf(layer);
            this.layers[i].detach();
            this.layers.splice(i, 1);
        }
    }

    zooomToBbox(bbox) {
        let center = new THREE.Vector3(bbox.min.x + (bbox.max.x - bbox.min.x) / 2, bbox.min.y + (bbox.max.y - bbox.min.y) / 2, bbox.min.z + (bbox.max.z - bbox.min.z) / 2);
        this.Position = [center.x, center.y, center.z];

        const geometry = new THREE.BoxGeometry(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y, bbox.max.z - bbox.min.z);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
        const cube = new THREE.Mesh(geometry, material);

        cube.position.copy(center);

        viewer.zoomTo(cube, 1, 0);
        viewer.controls.stop();

        cube.geometry.dispose();
        cube.material.dispose();
    }

    center() {
        let bbox = new THREE.Box3();

        for (let layer of this.layers) bbox.union(layer.bbox());

        this.zooomToBbox(bbox);
    }
}