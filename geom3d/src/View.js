import { THREE, viewer } from "./misc/DependencyManager";
import { Cursor } from "./Cursor.js";
import { CSS2DRenderer, CSS2DObject } from "./three/CSS2DRenderer.js";
import { GeometryLayer } from "./layers/GeometryLayer.js";
import { Vector3 } from "../public/dependencies/potree/build/libs/three.js/build/three.module.js";

export class View {
    static cursor = new Cursor();

    static overlayScene = new THREE.Scene();
    static overlayRenderer = new CSS2DRenderer();

    static gpuPickingTexture = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
    static gpuPixelBuffer = new Uint8Array(4);

    static pointMinScale = 0.1;
    static pointMaxScale = 3;

    layers = [];
    interactions = [];

    constructor(config) {
        if (config.layers) this.layers = config.layers;
        if (config.interactions) this.interactions = config.interactions;
    }

    async initialize() {
        viewer.renderer.domElement.parentElement.appendChild(View.overlayRenderer.domElement);
        let container = document.getElementById('potree_render_area').getBoundingClientRect();
        View.overlayRenderer.setSize(container.width, container.height);

        const light = new THREE.AmbientLight(0xffffff, 0.8);
        viewer.scene.scene.add( light );
        
        const directionalLight = new THREE.DirectionalLight( 0x404040, 0.5);
        directionalLight.position.set(1,0,1);

        viewer.scene.scene.add( directionalLight );

        const directionalLight2 = new THREE.DirectionalLight( 0x404040, 0.5);
        directionalLight2.position.set(1,0,-1);

        viewer.scene.scene.add( directionalLight2 );

        for (let interaction of this.interactions) interaction.initialize();
        for (let layer of this.layers) await layer.attach();

        window.addEventListener('resize', (e) => {
            let container = document.getElementById('potree_render_area').getBoundingClientRect();
            viewer.renderer.setSize(container.width, container.height);
            View.overlayRenderer.setSize(container.width, container.height);
        })
        
        View.cursor.attachToScene(View.overlayScene);
        View.cursor.initializeEvents(this);

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

        if (scale > View.pointMaxScale) scale = View.pointMaxScale;

        for (let layer of this.layers) {
            if (layer instanceof GeometryLayer) {
                Cursor.raycaster.params.Points.threshold = scale;
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

    static getGpuPickIntersect(e, gpuPickingScene) {    
        viewer.renderer.setRenderTarget(View.gpuPickingTexture)
        viewer.renderer.render(gpuPickingScene, viewer.scene.getActiveCamera());
        viewer.renderer.setRenderTarget(null);
    
        let x = e.clientX * window.devicePixelRatio;
        let y = View.gpuPickingTexture.height - e.clientY * window.devicePixelRatio;
    
        viewer.renderer.readRenderTargetPixels(View.gpuPickingTexture, x, y, 1, 1, View.gpuPixelBuffer);
    
        let id =(View.gpuPixelBuffer[0] << 16) | (View.gpuPixelBuffer[1] << 8) | (View.gpuPixelBuffer[2]);    
        return id;
    }
}