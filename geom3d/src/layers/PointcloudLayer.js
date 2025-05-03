import { Potree, THREE, viewer } from "../misc/DependencyManager";
import { Layer } from "./Layer";

export class PointcloudLayer extends Layer {
    visible = true;
    urls = [];
    material = null;
    pointclouds = [];
    attached = false;

    type = "PointcloudLayer"

    constructor(config) {
        super(config);

        if (config.urls) this.urls = config.urls;
        if (config.material) this.material = config.material;
    }

    async attach() {
        for (let url of this.urls) await this.add(url, this.material);
        this.attached = true;
    }

    detach() {
        for (let pointcloud of this.pointclouds) this.remove(pointcloud, false);

        this.pointclouds = [];
        this.urls = [];
    }

    async add(url, config) {
        return new Promise((resolve, reject) => {
            Potree.loadPointCloud(url, "", e => {
                let pointcloud = e.pointcloud;
                let material = pointcloud.material;

                if (config && config.material) {
                    material.size = config.material.size;
                    material.pointSizeType = config.material.pointSizeType;
                    material.shape = config.material.shape;
                }
                else {
                    material.size = 1;
                    material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
                    material.shape = Potree.PointShape.SQUARE;
                }

                if (this.attached) this.urls.push(url);
                this.pointclouds.push(pointcloud);
                viewer.scene.addPointCloud(pointcloud);
                viewer.fitToScreen();

                this.updateVisibility();
                resolve();
            });
        })
    }

    remove(pointcloud, removeFromArray = true) {
        viewer.scene.scenePointCloud.remove(pointcloud)

        if (this.pointclouds.indexOf(pointcloud) > -1) {
            let i = this.pointclouds.indexOf(pointcloud);

            if (removeFromArray) {
                this.pointclouds.splice(i, 1);
                this.urls.splice(i, 1);
            }
        }
    }

    updateVisibility() {
        for (let pointcloud of this.pointclouds) pointcloud.visible = this.visible;
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

        for (let pointcloud of this.pointclouds) {
            bbox.union(pointcloud.boundingBox.clone().translate(pointcloud.position));
        }

        return bbox;
    }
}