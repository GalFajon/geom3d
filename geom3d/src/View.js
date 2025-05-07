import { THREE, viewer } from "./misc/DependencyManager";
import { Cursor } from "./Cursor.js";
import { CSS2DRenderer, CSS2DObject } from "./three/CSS2DRenderer.js";
import { Draw } from "./interactions/Draw.js";
import { OverlayLayer } from "./layers/OverlayLayer.js";
import { GeometryLayer } from "./layers/GeometryLayer.js";
import { Vector3 } from "../public/dependencies/potree/build/libs/three.js/build/three.module.js";

export class View {
    static cursor = new Cursor();

    static overlayScene = new THREE.Scene();
    static overlayRenderer = new CSS2DRenderer();

    static pointMinScale = 0.01;
    static pointMaxScale = 10;

    layers = [];
    interactions = [];

    constructor(config) {
        if (config.layers) this.layers = config.layers;
        if (config.interactions) this.interactions = config.interactions;
    }

    async initialize() {
        viewer.renderer.domElement.parentElement.appendChild(View.overlayRenderer.domElement);

        View.cursor.attachToScene(View.overlayScene);
        View.cursor.initializeEvents(this);

        let container = document.getElementById('potree_render_area').getBoundingClientRect();
        View.overlayRenderer.setSize(container.width, container.height);

        const light = new THREE.AmbientLight();
        viewer.scene.scene.add( light );
        
        for (let interaction of this.interactions) interaction.initialize();
        for (let layer of this.layers) await layer.attach();

        window.addEventListener('resize', (e) => {
            let container = document.getElementById('potree_render_area').getBoundingClientRect();
            viewer.renderer.setSize(container.width, container.height);
            View.overlayRenderer.setSize(container.width, container.height);
        })

        this.everyFrame();
    }

    async addLayer(layer) {
        this.layers.push(layer);
        await layer.attach();
    }

    addInteraction(interaction) {
        this.interactions.push(interaction);
        interaction.initialize();
    }

    removeInteraction(interaction) {
        if (this.interactions.indexOf(interaction) > -1) {
            interaction.remove();
            this.interactions.splice(this.interactions.indexOf(interaction),1);
        }
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

        if (this.layers.length > 0) for (let layer of this.layers) bbox.union(layer.bbox());
        else bbox = new THREE.Box3(new Vector3(0, 0, 0), new Vector3(10, 10, 10));

        this.zooomToBbox(bbox);
    }

    scale() {
        if (View.cursor) {
            let distance = View.cursor.model.position.distanceTo(viewer.scene.view.position);
            let pr = Potree.Utils.projectedRadius(1, viewer.scene.getActiveCamera(), distance, viewer.clientwidth, viewer.renderer.domElement.clientHeight);
            let scale = 10 / pr;

            if (scale > 3) scale = 2;

            if (View.cursor.snapped) scale *= 3;

            View.cursor.model.scale.set(scale, scale, scale);
        }

        let distance = viewer.scene.view.position.z - View.cursor.model.position.z;
        let pr = Potree.Utils.projectedRadius(1, viewer.scene.getActiveCamera(), distance, viewer.clientwidth, viewer.renderer.domElement.clientHeight);
        let scale = 30 / pr;

        if (scale < View.pointMinScale) scale = View.pointMinScale;
        if (scale > View.pointMaxScale) scale = View.pointMaxScale;

        for (let interaction of this.interactions) {
            if (interaction instanceof Draw) {
                interaction.drawHelper.pointscloud.material.size = scale;
            }
        }

        for (let layer of this.layers) {
            if (layer instanceof OverlayLayer && layer.UseVisibilityDistance) {
                for (let overlay of layer.overlays) {
                    if (overlay.model.position.distanceTo(viewer.scene.view.position) > overlay.VisibilityDistance) overlay.model.visible = false;
                    else if (layer.visible) overlay.model.visible = true;
                }
            }

            if (layer instanceof GeometryLayer) {
                Cursor.raycaster.params.Points.threshold = scale;

                for (let value of layer.pointscloud.values()) value.material.size = scale;
            }
        }
    }

    everyFrame() {
        this.scale();

        viewer.renderer.clearDepth();
        viewer.renderer.render(View.overlayScene, viewer.scene.getActiveCamera());
        View.overlayRenderer.render(viewer.scene.scene, viewer.scene.getActiveCamera());
        View.overlayRenderer.render(View.overlayScene, viewer.scene.getActiveCamera());

        requestAnimationFrame(this.everyFrame.bind(this));

        for (let layer of this.layers) {
            if (layer.visible == false) layer.hide();
            else layer.show();
        }
    }
}