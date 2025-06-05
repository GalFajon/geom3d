import { CSS2DObject } from "./three/CSS2DRenderer.js";
import { THREE, viewer, Potree } from "./misc/DependencyManager";
import { Snap } from "./interactions/Snap.js";
import { PointcloudLayer } from "./layers/PointcloudLayer.js";
import { SnapLine } from "./interactions/helpers/SnapLine.js";
import { IFCLayer } from "./layers/IFCLayer.js";
import { GeometryLayer } from "./layers/GeometryLayer.js";

export class Cursor {

    static material = new THREE.SpriteMaterial({ map: Cursor.generateSpriteTexture('black'), depthTest: false, depthWrite: false, transparent: true });
    static snapMaterial = new THREE.MeshBasicMaterial({ map: Cursor.generateSpriteTexture(null), depthTest: false, depthWrite: false, transparent: true });

    static raycaster = new THREE.Raycaster();

    static generateSpriteTexture(color) {
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext("2d");

        canvas.width = 64;
        canvas.height = 64;
        canvas.style.width = 64 + "px";
        canvas.style.height = 64 + "px";

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.strokeStyle = 'black';
        if (color) ctx.fillStyle = color;
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - 3, 0, 2 * Math.PI, false);
        if (color) ctx.fill();
        ctx.stroke();

        let texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;

        canvas.remove();
        return texture;
    }

    generateCursorHelper() {
        let dot = document.createElement('span');

        dot.style.height = '5px';
        dot.style.width = '5px';
        dot.style.backgroundColor = 'white';
        dot.style.borderRadius = '50%';
        dot.style.display = 'inline-block';
        dot.style.pointerEvents = 'none';
        dot.style.border = '0.5px solid black';
        return dot;
    }

    generateHeightHelper() {
        let paragraph = document.createElement('p');

        paragraph.innerText = this.model.position.z;
        paragraph.style.color = 'white';
        paragraph.style.textShadow = '-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black';
        paragraph.style.pointerEvents = 'none';
        paragraph.style.paddingTop = '50px';
        paragraph.style.paddingLeft = '50px';

        return paragraph;
    }

    constructor() {
        this.mousePosition = [0, 0, 0];
        this.position = [0, 0, 0];
        this.type = 'Cursor';

        this.updateOwnPosition = true;
        this.movedMouse = false;
        this.snapped = false;
        this.snappedObject = undefined;

        this.model = new THREE.Sprite(Cursor.material);

        this.cursorHelperElement = this.generateCursorHelper();
        this.heightHelperElement = this.generateHeightHelper();

        this.cursorHelperModel = new CSS2DObject(this.cursorHelperElement);
        this.heightHelperModel = new CSS2DObject(this.heightHelperElement);
        this.model.userData = this;

        this.snapDistance = 1;
        this.ifcSnapDistance = 0.1;
        this.ifcVertexDistanceBuffer = 0.1;
        this.pointSnapDistance = 0.3;

        this.view = undefined;

        this.showHeightHelper();
    }

    attachToScene(scene) {
        scene.add(this.model);
        scene.add(this.cursorHelperModel);
        scene.add(this.heightHelperModel);
    }

    initializeEvents(view) {
        this.domElement = viewer.renderer.domElement;
        this.view = view;

        this.domElement.addEventListener('mousemove', (event) => {
            this.updatePosition(event);
            this.movedMouse = true;
        })

        this.domElement.addEventListener('pointerdown', (event) => {
            this.updateHeight(event);
            this.movedMouse = false;
        })
    }

    updateModelPosition() {
        this.model.position.set(this.position[0], this.position[1], this.position[2]);
        this.heightHelperElement.innerText = 'z: ' + Math.round(this.position[2] * 100) / 100;
        this.cursorHelperModel.position.set(this.position[0], this.position[1], this.position[2]);
        this.heightHelperModel.position.set(this.position[0], this.position[1], this.position[2]);
    }

    updatePosition(e) {
        try {
            let view = this.view;
            let mouse = new THREE.Vector2(
                (e.layerX / this.domElement.getBoundingClientRect().width) * 2 - 1,
                -(e.layerY / this.domElement.getBoundingClientRect().height) * 2 + 1
            );

            let vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
            vector.unproject(viewer.scene.getActiveCamera().clone());
            vector.sub(viewer.scene.getActiveCamera().clone().position).normalize();

            let targetZ = this.position[2];

            let distance = (targetZ - viewer.scene.getActiveCamera().clone().position.z) / vector.z;
            let position = (viewer.scene.getActiveCamera().clone().position).add(vector.multiplyScalar(distance));
            
            let snapRaycastList = [];
            let snapPointRaycastList = []
            let snapPointClouds = [];
            let snapPointList = [];
            let snapIFCs = [];

            for (let interaction of view.interactions) {
                if (interaction instanceof Snap) {
                    if (interaction.active == true) {
                        if (interaction.target == undefined || !interaction.target.beingModified) {
                            snapPointList.push(interaction.snapPoints);
                            snapPointRaycastList.push(interaction.snapPointCloud);
                            snapRaycastList.push(...interaction.snapLines.map(line => line.model));

                            for (let source of interaction.parentSources) {
                                if (source instanceof IFCLayer) for (let model of source.models) snapIFCs.push(model);
                                if (source instanceof PointcloudLayer) snapPointClouds.push(...source.pointclouds);
                            }
                        }
                    }
                }
            }

            let snappedToPoint = false;
            let snappedToLine = false;
            let snappedToPtcld = false;
            let snappedToIFC = false;

            // do ifc snapping -> get three nearest vertices to the mouse intersected face and add them as snap points
            if (snapIFCs.length > 0) {
                for (let model of snapIFCs) {
                    let offset = (new THREE.Vector3()).setFromMatrixPosition(model.coordinationMatrix);
                    let intersects = this.getMouseIntersect(mouse, model.children);
                    
                    for (let intersect of intersects) {                
                        let vA = new THREE.Vector3(
                            intersect.object.geometry.attributes.position.array[intersect.face.a * 3],
                            intersect.object.geometry.attributes.position.array[intersect.face.a * 3 + 1],
                            intersect.object.geometry.attributes.position.array[intersect.face.a * 3 + 2]
                        );

                        let vB = new THREE.Vector3(
                            intersect.object.geometry.attributes.position.array[intersect.face.b * 3],
                            intersect.object.geometry.attributes.position.array[intersect.face.b * 3 + 1],
                            intersect.object.geometry.attributes.position.array[intersect.face.b * 3 + 2]
                        );
                        
                        let vC = new THREE.Vector3(
                            intersect.object.geometry.attributes.position.array[intersect.face.c * 3],
                            intersect.object.geometry.attributes.position.array[intersect.face.c * 3 + 1],
                            intersect.object.geometry.attributes.position.array[intersect.face.c * 3 + 2]
                        );

                        vA.set(vA.x, vA.y, vA.z)
                        vB.set(vB.x, vB.y, vB.z)
                        vC.set(vC.x, vC.y, vC.z)
                        
                        let im = [];
                        for (let i=0; i < 16; i++) im.push(intersect.object.instanceMatrix.array[intersect.instanceId * 16 + i]);             
                        let im4 = new THREE.Matrix4().fromArray(im);

                        vA.applyMatrix4(im4);
                        vA.applyAxisAngle(new THREE.Vector3(1,0,0),Math.PI / 2);
                        vA.add(new THREE.Vector3(-offset.x, offset.z, -offset.y));

                        vB.applyMatrix4(im4);
                        vB.applyAxisAngle(new THREE.Vector3(1,0,0),Math.PI / 2);
                        vB.add(new THREE.Vector3(-offset.x, offset.z, -offset.y));

                        vC.applyMatrix4(im4);
                        vC.applyAxisAngle(new THREE.Vector3(1,0,0),Math.PI / 2);
                        vC.add(new THREE.Vector3(-offset.x, offset.z, -offset.y));

                        if (vA.distanceTo(vB) > 1 || vA.distanceTo(vC) > 1) {
                            if (intersect.point.distanceTo(vA) < this.ifcVertexDistanceBuffer) { this.snapTo([vA.x, vA.y, vA.z], intersect.object); snappedToIFC = true; }
                            if (intersect.point.distanceTo(vB) < this.ifcVertexDistanceBuffer) { this.snapTo([vB.x, vB.y, vB.z], intersect.object); snappedToIFC = true; }
                            if (intersect.point.distanceTo(vC) < this.ifcVertexDistanceBuffer) { this.snapTo([vC.x, vC.y, vC.z], intersect.object); snappedToIFC = true; }   
                        }                 
                    }
                }
            }

            for (let i = 0; i < snapPointRaycastList.length; i++) {
                if (snapPointList[i].length > 0) {
                    let pointIntersects = this.getMouseIntersect(mouse, [snapPointRaycastList[i]]);

                    if (pointIntersects && pointIntersects[0]) {
                        let p = new THREE.Vector3(...snapPointList[i][pointIntersects[0].index].coordinates);

                        if (pointIntersects[0].index !== undefined && p.distanceTo(pointIntersects[0].point) < this.pointSnapDistance) {
                            this.snapTo(snapPointList[i][pointIntersects[0].index].coordinates, snapPointList[i][pointIntersects[0].index].refersTo);
                            snappedToPoint = true;
                            break;
                        }
                    }
                }
            }

            if (!snappedToPoint && !snappedToIFC) {
                let intersected = this.getMouseIntersect(mouse, snapRaycastList);

                if (intersected && intersected[0]) {
                    if (intersected[0].object.userData instanceof SnapLine) {
                        this.snapTo([intersected[0].point.x, intersected[0].point.y, intersected[0].point.z], intersected[0].object.userData.refersTo);
                        snappedToLine = true;
                    }
                }
            }

            if (!snappedToPoint && !snappedToLine && !snappedToIFC) {
                let pointcloudIntersection = Potree.Utils.getMousePointCloudIntersection(
                    viewer.inputHandler.mouse,
                    viewer.scene.getActiveCamera(),
                    viewer,
                    snapPointClouds
                );

                if (pointcloudIntersection) {
                    this.snapTo([pointcloudIntersection.location.x, pointcloudIntersection.location.y, pointcloudIntersection.location.z]);
                    snappedToPtcld = true;
                }
            }

            if (!snappedToPoint && !snappedToPtcld && !snappedToLine && !snappedToIFC) this.unsnap();

            if (!this.snapped) {
                this.mousePosition = [position.x, position.y, position.z];
                this.position = [position.x, position.y, position.z];
                this.updateModelPosition();
            }
        }
        catch (err) { console.log(err) }
    }

    updateHeight(e) {
        let view = this.view;
        let mouse = new THREE.Vector2(
            (e.layerX / this.domElement.getBoundingClientRect().width) * 2 - 1, // x
            -(e.layerY / this.domElement.getBoundingClientRect().height) * 2 + 1 // y
        );

        Cursor.raycaster.setFromCamera(mouse, viewer.scene.getActiveCamera());

        try {
            if (!this.snapped) {

                let I = undefined;
                
                if (viewer.scene.pointclouds.length > 0) {
                    I = Potree.Utils.getMousePointCloudIntersection(
                        e,
                        viewer.scene.getActiveCamera(),
                        viewer,
                        viewer.scene.pointclouds,
                        { pickClipped: false }
                    );
                }

                const raycastList = [];

                for (let source of view.layers) {
                    if ((source instanceof PointcloudLayer || source instanceof GeometryLayer || source instanceof IFCLayer) && source.models) {
                        for (let model of source.models) raycastList.push(model);
                        if (source instanceof GeometryLayer) for (let cloud of source.pointscloud.values()) {
                            if (cloud.geometry.getAttribute('position') && cloud.geometry.getAttribute('position').count > 0) 
                                raycastList.push(cloud)
                        }
                    }
                }

                let intersected = Cursor.raycaster.intersectObjects(raycastList, true);

                let vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
                vector.unproject(viewer.scene.getActiveCamera().clone());
                vector.sub(viewer.scene.getActiveCamera().clone().position).normalize();

                let targetZ;

                if (intersected && intersected[0] && intersected[0].point.z !== 0) targetZ = intersected[0].point.z;
                else if (I) targetZ = I.location.z;
                else targetZ = this.position[2];

                let distance = (targetZ - viewer.scene.getActiveCamera().clone().position.z) / vector.z;
                let position = (viewer.scene.getActiveCamera().clone().position).add(vector.multiplyScalar(distance));

                this.mousePosition = [position.x, position.y, position.z];
                this.position = [position.x, position.y, position.z];
                this.updateModelPosition();
            }
        }
        catch (err) { console.log(err); }
    }

    getMouseIntersect(mouse, list) {
        Cursor.raycaster.setFromCamera(mouse, viewer.scene.getActiveCamera());

        let intersected = Cursor.raycaster.intersectObjects(list, false);
        return intersected;
    }

    snapTo([x, y, z], object) {
        this.updateOwnPosition = false;

        this.snapped = true;
        this.snappedObject = object;

        this.position = [x, y, z];
        this.mousePosition = [x, y, z];
        this.updateModelPosition();

        this.model.material = Cursor.snapMaterial;
    }

    unsnap() {
        this.snapped = false;
        this.updateOwnPosition = true;
        this.snappedObject = undefined;
        this.model.material = Cursor.material;
    }

    showHeightHelper() {
        this.heightHelperModel.visible = true;
    }

    hideHeightHelper() {
        this.heightHelperModel.visible = false;
    }
}

Cursor.raycaster.params.Points.threshold = 0.1;
Cursor.raycaster.params.Line.threshold = 0.1;