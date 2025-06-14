import { Line } from "../geometry/Line";
import { Polygon } from "../geometry/Polygon";
import { Point } from "../geometry/Point";

import { THREE, viewer } from "../misc/DependencyManager";
import { Layer } from "./Layer";
import { LineMaterial } from '../three/fatlines/LineMaterial.js'
import { View } from "../View.js";
import { Cursor } from "../Cursor.js";

export class GeometryLayer extends Layer {
    static meshSelectionMaterial = new THREE.MeshBasicMaterial( {color: 'lightgreen', side: THREE.DoubleSide, transparent: false } );
    static lineSelectionMaterial = new LineMaterial( { color: 'lightgreen', linewidth: 5, vertexColors: false, resolution: new THREE.Vector2(1000, 1000), dashed: false, alphaToCoverage: true });
    
    static pointMaterial2 = new THREE.PointsMaterial({ color: '#C41E3A', size: 0.2, sizeAttenuation: true, depthTest: true });
    //static selectedPointMaterial = new THREE.PointsMaterial({ color: 'lightgreen', size: 0.5, sizeAttenuation: true });

    //  / gl_Position.z
    static pointMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xffffff) },
            pointTexture: { value: Cursor.generateSpriteTexture('red') },
        },
        vertexShader: `
			void main() {
				vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                gl_Position = projectionMatrix * mvPosition;
                gl_Position.z -= 0.01 / gl_Position.z;
                gl_PointSize = ((gl_Position.z / 100.0) + 10.0) <= 10.0 ? ((gl_Position.z / 100.0) + 10.0) : 10.0;
            }
        `,
        fragmentShader: `
        	uniform vec3 color;
			uniform sampler2D pointTexture;

			void main() {
				gl_FragColor = vec4( color, 1.0 );
				gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord ) * 1.0;
			}
        `,
        depthTest: true,
        transparent: true,
        depthWrite: false,
    });

    static pickingPointMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color('red') },
        },
        vertexShader: `
        	attribute vec3 color;
            varying vec3 vColor;

            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                gl_Position = projectionMatrix * mvPosition;
                gl_Position.z -= 0.01 / gl_Position.z;
                gl_PointSize = ((gl_Position.z / 100.0) + 10.0) <= 10.0 ? ((gl_Position.z / 100.0) + 10.0) : 10.0;
            }
        `,
        fragmentShader: `
			uniform sampler2D pointTexture;
            varying vec3 vColor;

			void main() {
				gl_FragColor = vec4( vColor, 1.0 );
			}
        `,
        depthTest: true,
        transparent: true,
    })

    static selectedPointMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xffffff) },
            pointTexture: { value: Cursor.generateSpriteTexture('lightgreen') },
        },
        vertexShader: `
			void main() {
				vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                gl_Position = projectionMatrix * mvPosition;
                gl_Position.z -= 0.01 / gl_Position.z;
                gl_PointSize = ((gl_Position.z / 100.0) + 10.0) <= 10.0 ? ((gl_Position.z / 100.0) + 10.0) : 10.0;
            }
        `,
        fragmentShader: `
        	uniform vec3 color;
			uniform sampler2D pointTexture;

			void main() {
				gl_FragColor = vec4( color, 1.0 );
				gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord ) * 1.0;
			}
        `,
        depthTest: true,
        transparent: true,
    })

    visible = true;
    geometries = [];
    models = [];
    highlight = true;

    points = new Map()
    pointscloud = new Map()
    pointvertices = new Map()

    gpuPickingScene = new THREE.Scene();
    gpuPointscloud = new Map()
    gpuPointColorIds = new Map()
    gpuPointColors = new Map()
    
    depthTesting = true;

    type = "GeometryLayer"

    constructor(config) {
        super(config);

        this.points.set('default', []);
        this.points.set('highlighted', []);
        
        let def = new THREE.Points(new THREE.BufferGeometry(), GeometryLayer.pointMaterial);
        let highlighted = new THREE.Points(new THREE.BufferGeometry(), GeometryLayer.selectedPointMaterial);

        let defGpu = new THREE.Points(new THREE.BufferGeometry(), GeometryLayer.pickingPointMaterial);
        let highlightedGpu = new THREE.Points(new THREE.BufferGeometry(), GeometryLayer.pickingPointMaterial);

        this.pointscloud.set('default', def);
        this.pointscloud.set('highlighted', highlighted);

        this.gpuPointscloud.set('default', defGpu);
        this.gpuPointscloud.set('highlighted', highlightedGpu);

        this.pointvertices.set('default', []);
        this.pointvertices.set('highlighted', []);

        this.geometries = config.geometries;
    }

    disableDepthTesting() {
        if (this.depthTesting) {
            for (let model of this.models) {
                viewer.scene.scene.remove(model);
                View.overlayScene.add(model);
            }

            for (let pointscloud of this.pointscloud.values()) {
                viewer.scene.scene.remove(pointscloud);
                View.overlayScene.add(pointscloud);
            }

            this.depthTesting = false;
        }
    }

    enableDepthTesting() {
        if (!this.depthTesting) {
            for (let model of this.models) {
                View.overlayScene.remove(model);
                viewer.scene.scene.add(model);
            }

            for (let pointscloud of this.pointscloud.values()) {
                View.overlayScene.remove(pointscloud);
                viewer.scene.scene.add(pointscloud);
            }

            this.depthTesting = true;
        }
    }

    updatePoints() {
        this.gpuPointColors.set('default', []);
        this.gpuPointColors.set('highlighted', []);

        this.pointvertices.set('default', []);
        this.pointvertices.set('highlighted', []);

        this.points.set('default', []);
        this.points.set('highlighted', []);

        let rootCoords = [];
        let first = true;

        let color = new THREE.Color();
        let colorIndex = 1;

        for (let geometry of this.geometries) {
            if (geometry instanceof Point) {
                if (first == true) {
                    rootCoords = geometry.vectors;
                    first = false;
                }

                let rgb = color.setHex(colorIndex);
                this.gpuPointColorIds.set(colorIndex, geometry);

                colorIndex++;

                let relativeCoords = [geometry.vectors[0] - rootCoords[0], geometry.vectors[1] - rootCoords[1], geometry.vectors[2] - rootCoords[2]];

                if (geometry.highlighted) {
                    this.points.get('highlighted').push(geometry);
                    this.pointvertices.get('highlighted').push(...relativeCoords);
                    this.gpuPointColors.get('highlighted').push(rgb.r, rgb.g, rgb.b);

                }
                else {
                    this.points.get('default').push(geometry);
                    this.pointvertices.get('default').push(...relativeCoords);
                    this.gpuPointColors.get('default').push(rgb.r, rgb.g, rgb.b);
                }
            }
        }

        for (const [key, value] of this.pointscloud) {
            if (this.depthTesting) viewer.scene.scene.remove(value);
            else View.overlayScene.remove(value);

            this.gpuPickingScene.remove(this.gpuPointscloud[key]);

            if (this.pointvertices.get(key).length > 0) {
                value.geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.pointvertices.get(key), 3));
                value.geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.gpuPointColors.get(key), 3));
                value.geometry.setDrawRange(0, this.pointvertices.get(key).length);
                value.geometry.verticesNeedUpdate = true;
                value.geometry.computeBoundingSphere();
                value.position.set(...rootCoords);

                this.gpuPointscloud.get(key).geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.pointvertices.get(key), 3));
                this.gpuPointscloud.get(key).geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.gpuPointColors.get(key), 3));
                this.gpuPointscloud.get(key).geometry.setDrawRange(0, this.pointvertices.get(key).length);
                this.gpuPointscloud.get(key).geometry.verticesNeedUpdate = true;
                this.gpuPointscloud.get(key).geometry.computeBoundingSphere();
                this.gpuPointscloud.get(key).position.set(...rootCoords);

                if (this.depthTesting) viewer.scene.scene.add(value);
                else View.overlayScene.add(value);
                
                this.gpuPickingScene.add(this.gpuPointscloud.get(key));
            }
            else {
                value.geometry.dispose();
                value.material.dispose();

                this.gpuPointscloud.get(key).geometry.dispose();
                this.gpuPointscloud.get(key).material.dispose();
            }
        }
    }

    attach() {
        for (let geometry of this.geometries) this.add(geometry);

        this.updatePoints();
        this.attached = true;
    }

    detach() {
        for (let geometry of this.geometries) this.remove(geometry, false);

        this.geometries = [];

        this.updatePoints();
        this.attached = false;
    }

    highlightGeometry(geometry) {
        if (geometry instanceof Line) {
            geometry.model.material = GeometryLayer.lineSelectionMaterial;
        }
        else if(geometry instanceof Point) {
            geometry.highlighted = true;
            this.updatePoints();
        }
        else if (geometry instanceof Polygon) geometry.model.material = GeometryLayer.meshSelectionMaterial;
    }

    removeGeometryHighlight(geometry) {
        if (geometry) {
            if (geometry instanceof Line) {
                geometry.model.material = Line.material;
            }
            else if (geometry instanceof Point) {
                geometry.highlighted = false;
                this.updatePoints();
            }
            else if (geometry instanceof Polygon) {
                geometry.model.material = Polygon.material;
            }
        }
    }

    add(geometry) {
        if (this.attached) this.geometries.push(geometry);

        if (geometry instanceof Line || geometry instanceof Polygon) {
            this.models.push(geometry.model);

            if (this.depthTesting) viewer.scene.scene.add(geometry.model);
            else View.overlayScene.add(geometry.model);
        }
        else if (geometry instanceof Point) {
            if (geometry.highlighted) this.points.get('highlighted').push(geometry);
            else this.points.get('default').push(geometry);

            if (this.attached) this.updatePoints();
        }

        const customEvent = new CustomEvent('added', { detail: { source: this, geometry: geometry } });
        this.dispatchEvent(customEvent);
    }

    remove(geometry, removeFromArray = true) {        
        if (
            this.geometries.indexOf(geometry) > -1
        ) {
            let i = this.geometries.indexOf(geometry);
            
            if (geometry instanceof Line || geometry instanceof Polygon) {
                if (this.depthTesting) viewer.scene.scene.remove(geometry.model);
                else View.overlayScene.remove(geometry.model);
            }

            if (removeFromArray) {
                if (this.models.indexOf(geometry.model) > -1) this.models.splice( this.models.indexOf(geometry.model), 1);
                this.geometries.splice(i, 1);
            }
        }

        if (geometry instanceof Point && removeFromArray) this.updatePoints();

        const customEvent = new CustomEvent('removed', { detail: { source: this, geometry: geometry } });
        this.dispatchEvent(customEvent);
    }

    updateVisibility() {
        for (let models of this.models) models.visible = this.visible;
        for (let pointscloud of this.pointscloud.values()) pointscloud.visible = this.visible;
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

        for (let geometry of this.geometries) {
            if (geometry instanceof Line) {
                for (let vector of geometry.vectors) {
                    bbox.expandByPoint(new THREE.Vector3(...vector));
                }
            }
            else if (geometry instanceof Polygon) {
                for (let vector of geometry.vectors) {
                    bbox.expandByPoint(new THREE.Vector3(...vector));
                }
            }
            else if (geometry instanceof Point) {
                bbox.expandByPoint(new THREE.Vector3(...geometry.vectors));
            }
        }

        if (this.geometries.length == 1) bbox.expandByScalar(2)

        return bbox;
    }
}