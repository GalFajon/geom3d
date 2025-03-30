'use strict';

import * as THREE from '../../public/dependencies/potree/build/libs/three.js/build/three.module.js';

export class NoCloudControls extends Potree.EarthControls {
    constructor(viewer) {
        super(viewer);

        this.viewer = viewer;
        this.renderer = viewer.renderer;

        this.scene = null;
        this.sceneControls = new THREE.Scene();

        this.rotationSpeed = 10;

        this.targetZ = 0;

        this.fadeFactor = 10;
        this.wheelDelta = 0;
        this.zoomDelta = new THREE.Vector3();
        this.camStart = null;

        this.tweens = [];

        this.raycaster = new THREE.Raycaster();

        {
            let sg = new THREE.SphereGeometry(1, 16, 16);
            let sm = new THREE.MeshNormalMaterial();
            this.pivotIndicator = new THREE.Mesh(sg, sm);
            this.pivotIndicator.visible = false;
            this.sceneControls.add(this.pivotIndicator);
        }

        let drag = (e) => {
            if (e.drag.object !== null) {
                return;
            }

            if (!this.pivot) {
                return;
            }

            if (e.drag.startHandled === undefined) {
                e.drag.startHandled = true;

                this.dispatchEvent({ type: 'start' });
            }

            let camStart = this.camStart;
            let camera = this.scene.getActiveCamera();
            let view = this.viewer.scene.view;

            // let camera = this.viewer.scene.camera;
            let mouse = e.drag.end;
            let domElement = this.viewer.renderer.domElement;

            if (e.drag.mouse === THREE.MOUSE.LEFT) {

                let ray = Potree.Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
                let plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
                    new THREE.Vector3(0, 0, 1),
                    this.pivot);

                let distanceToPlane = ray.distanceToPlane(plane);

                if (distanceToPlane > 0) {
                    let I = new THREE.Vector3().addVectors(
                        camStart.position,
                        ray.direction.clone().multiplyScalar(distanceToPlane));

                    let movedBy = new THREE.Vector3().subVectors(
                        I, this.pivot);

                    let newCamPos = camStart.position.clone().sub(movedBy);

                    view.position.copy(newCamPos);

                    {
                        let distance = newCamPos.distanceTo(this.pivot);
                        view.radius = distance;
                        let speed = view.radius / 2.5;
                        this.viewer.setMoveSpeed(speed);
                    }
                }
            } else if (e.drag.mouse === THREE.MOUSE.RIGHT) {
                let ndrag = {
                    x: e.drag.lastDrag.x / this.renderer.domElement.clientWidth,
                    y: e.drag.lastDrag.y / this.renderer.domElement.clientHeight
                };

                let yawDelta = -ndrag.x * this.rotationSpeed * 0.5;
                let pitchDelta = -ndrag.y * this.rotationSpeed * 0.2;

                let originalPitch = view.pitch;
                let tmpView = view.clone();
                tmpView.pitch = tmpView.pitch + pitchDelta;
                pitchDelta = tmpView.pitch - originalPitch;

                let pivotToCam = new THREE.Vector3().subVectors(view.position, this.pivot);
                let pivotToCamTarget = new THREE.Vector3().subVectors(view.getPivot(), this.pivot);
                let side = view.getSide();

                pivotToCam.applyAxisAngle(side, pitchDelta);
                pivotToCamTarget.applyAxisAngle(side, pitchDelta);

                pivotToCam.applyAxisAngle(new THREE.Vector3(0, 0, 1), yawDelta);
                pivotToCamTarget.applyAxisAngle(new THREE.Vector3(0, 0, 1), yawDelta);

                let newCam = new THREE.Vector3().addVectors(this.pivot, pivotToCam);
                // TODO: Unused: let newCamTarget = new THREE.Vector3().addVectors(this.pivot, pivotToCamTarget);

                view.position.copy(newCam);
                view.yaw += yawDelta;
                view.pitch += pitchDelta;
            }
        };

        let onMouseDown = e => {
            let I = Potree.Utils.getMousePointCloudIntersection(
                e.mouse,
                this.scene.getActiveCamera(),
                this.viewer,
                this.scene.pointclouds,
                { pickClipped: false });

            if (I) {
                this.pivot = I.location;
                this.camStart = this.scene.getActiveCamera().clone();
                this.pivotIndicator.visible = true;
                this.pivotIndicator.position.copy(I.location);
                this.targetZ = I.location.z;
            }
            // Gal -> Kontrole se zdaj da premikati brez pivota
            else {
                let vec = new THREE.Vector3(); // create once and reuse

                let mouse = new THREE.Vector2(
                    (e.mouse.x / this.renderer.domElement.clientWidth) * 2 - 1,
                    - (e.mouse.y / this.renderer.domElement.clientHeight) * 2 + 1
                )

                vec.set(mouse.x, mouse.y, 0.5);
                vec.unproject(this.scene.getActiveCamera().clone());
                vec.sub(this.scene.getActiveCamera().clone().position).normalize();

                this.updateTargetZ(e);

                let distance = (this.targetZ - this.scene.getActiveCamera().clone().position.z) / vec.z;
                let pos = (this.scene.getActiveCamera().clone().position).add(vec.multiplyScalar(distance));

                this.pivot = pos;
                this.camStart = this.scene.getActiveCamera().clone();
                this.pivotIndicator.visible = true;
                this.pivotIndicator.position.copy(pos);
            }
        };

        let drop = e => {
            this.dispatchEvent({ type: 'end' });
        };

        let onMouseUp = e => {
            this.camStart = null;
            this.pivot = null;
            this.pivotIndicator.visible = false;
        };

        let scroll = (e) => {
            this.wheelDelta += e.delta;
        };

        let dblclick = (e) => {
            this.zoomToLocation(e.mouse);
        };

        this.addEventListener('drag', drag);
        this.addEventListener('drop', drop);
        this.addEventListener('mousewheel', scroll);
        this.addEventListener('mousedown', onMouseDown);
        this.addEventListener('mouseup', onMouseUp);
        this.addEventListener('dblclick', dblclick);
    }

    update(delta) {
        let view = this.scene.view;
        let camera = this.scene.getActiveCamera();

        let fade = Math.pow(0.5, this.fadeFactor * delta);

        let progression = 1 - fade;

        // compute zoom
        if (this.wheelDelta !== 0) {
            let I = Potree.Utils.getMousePointCloudIntersection(
                this.viewer.inputHandler.mouse,
                this.scene.getActiveCamera(),
                this.viewer,
                this.scene.pointclouds);

            if (I) {
                let resolvedPos = new THREE.Vector3().addVectors(view.position, this.zoomDelta);
                let distance = I.location.distanceTo(resolvedPos);
                let jumpDistance = distance * 0.2 * this.wheelDelta;
                let targetDir = new THREE.Vector3().subVectors(I.location, view.position);
                targetDir.normalize();

                resolvedPos.add(targetDir.multiplyScalar(jumpDistance));
                this.zoomDelta.subVectors(resolvedPos, view.position);

                {
                    let distance = resolvedPos.distanceTo(I.location);
                    view.radius = distance;
                    let speed = view.radius / 2.5;
                    this.viewer.setMoveSpeed(speed);
                }

                this.targetZ = I.location.z;
            }
            // Gal -> Zoom brez pointcloud intersectiona
            else {
                let vec = new THREE.Vector3(); // create once and reuse
                let pos = new THREE.Vector3(); // create once and reuse

                vec.set(
                    (this.viewer.inputHandler.mouse.x / this.renderer.domElement.clientWidth) * 2 - 1,
                    - (this.viewer.inputHandler.mouse.y / this.renderer.domElement.clientHeight) * 2 + 1,
                    0.5);

                vec.unproject(this.scene.getActiveCamera().clone());

                vec.sub(this.scene.getActiveCamera().clone().position).normalize();

                let distance = (this.targetZ - this.scene.getActiveCamera().clone().position.z) / vec.z;

                pos.copy(this.scene.getActiveCamera().clone().position).add(vec.multiplyScalar(distance));

                let resolvedPos = new THREE.Vector3().addVectors(view.position, this.zoomDelta);
                let resDistance = pos.distanceTo(resolvedPos);

                if (this.wheelDelta > 4) this.wheelDelta = 4;
                if (this.wheelDelta < -4) this.wheelDelta = -4;

                let jumpDistance = resDistance * 0.2 * this.wheelDelta;
                let targetDir = new THREE.Vector3().subVectors(pos, view.position);
                targetDir.normalize();

                resolvedPos.add(targetDir.multiplyScalar(jumpDistance));
                this.zoomDelta.subVectors(resolvedPos, view.position);
                {
                    let newDistance = resolvedPos.distanceTo(pos);
                    view.radius = newDistance;
                    let speed = view.radius / 2.5;

                    this.viewer.setMoveSpeed(speed);
                }
            }
        }

        // apply zoom
        if (this.zoomDelta.length() !== 0) {
            let p = this.zoomDelta.clone().multiplyScalar(progression);
            let newPos = new THREE.Vector3().addVectors(view.position, p);

            view.position.copy(newPos);
        }

        if (this.pivotIndicator.visible) {
            let distance = this.pivotIndicator.position.distanceTo(view.position);
            let pixelwidth = this.renderer.domElement.clientwidth;
            let pixelHeight = this.renderer.domElement.clientHeight;
            let pr = Potree.Utils.projectedRadius(1, camera, distance, pixelwidth, pixelHeight);
            let scale = (10 / pr);
            this.pivotIndicator.scale.set(scale, scale, scale);
        }

        // decelerate over time
        {
            this.zoomDelta.multiplyScalar(fade);
            this.wheelDelta = 0;
        }
    }

    updateTargetZ(event) {
        let normalizedMouseX = (event.mouse.x / this.viewer.renderer.domElement.clientWidth) * 2 - 1;
        let normalizedMouseY = -(event.mouse.y / this.viewer.renderer.domElement.clientHeight) * 2 + 1;

        this.raycaster.setFromCamera(new THREE.Vector2(normalizedMouseX, normalizedMouseY), this.scene.getActiveCamera());

        const raycastList = [];
        this.viewer.scene.scene.traverse(c => { if (c.visible == true && c.type != 'AxesHelper' && c.type != 'LineSegments' && c.userData.Type != 'Cursor3D' && !c.userData.beingModified) { raycastList.push(c); } });

        let intersected = this.raycaster.intersectObjects(raycastList, false);
        let sortedIntersects = intersected.sort((a, b) => { return a.point.z < b.point.z });

        if (sortedIntersects.length) {
            this.targetZ = sortedIntersects[0].point.z;
        }
    }
};