import { THREE } from '../../misc/DependencyManager.js';
import { Point } from '../../geometry/Point.js';
import { Line } from '../../geometry/Line.js';
import { Polygon } from '../../geometry/Polygon.js';

import { LineMaterial } from '../../three/fatlines/LineMaterial.js';
import { View } from '../../View.js';
import { Cursor } from '../../Cursor.js';

export class DrawHelper {

    static lineMaterial = new LineMaterial({ color: 'blue', linewidth: 5, vertexColors: false, resolution: new THREE.Vector2(1000, 1000), dashed: false, alphaToCoverage: true });
    static meshMaterial = new THREE.MeshBasicMaterial({ color: 'blue', transparent: false });
    static pointMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color: { value: new THREE.Color(0xffffff) },
            pointTexture: { value: Cursor.generateSpriteTexture('blue') },
        },
        vertexShader: `
			varying vec3 vColor;
            uniform float camPos;

			void main() {
				vColor = vec3(1.0, 1.0, 1.0);
                
				vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

				gl_Position = projectionMatrix * mvPosition;
                gl_PointSize = ((gl_Position.z / 100.0) + 10.0) <= 10.0 ? ((gl_Position.z / 100.0) + 10.0) : 10.0;
			}
        `,
        fragmentShader: `
        	uniform vec3 color;
			uniform sampler2D pointTexture;

			varying vec3 vColor;

			void main() {
				gl_FragColor = vec4( color * vColor, 1.0 );
				gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord );
			}
        `,
        depthTest: false,
        transparent: true
    });

    constructor(config) {
        this.Vectors = [];

        this.Points = [];
        this.pointscloud = new THREE.Points(new THREE.BufferGeometry(), DrawHelper.pointMaterial);

        this.Line = undefined;
        this.Polygon = undefined;

        this.scene = View.overlayScene;

        this.pointscloud.userData = this;

        this.geomType = config.geomType;
    }

    addVector(vector) {
        this.Vectors.push(vector);

        let point = new Point(vector, { material: DrawHelper.pointMaterial });
        this.Points.push(point);

        this.updatePoints();

        if (this.geomType == "Line" && this.Vectors.length > 1) {
            this.removeLine();

            let line = new Line(this.Vectors, { material: DrawHelper.lineMaterial });

            this.scene.add(line.model);
            this.Line = line;
            this.Line.model.userData = this;
        }

        if (this.geomType == "Polygon" && this.Vectors.length > 2) {
            this.removePolygon();

            let polygon = new Polygon([this.Vectors], { material: DrawHelper.meshMaterial });

            if (!this.Polygon) {
                this.scene.add(polygon.model);
            }

            this.Polygon = polygon;
            this.Polygon.model.userData = this;
        }
    }

    updatePoints() {
        let root = this.Vectors[0];
        let flat = [];
        for (let vector of this.Vectors) flat.push(vector[0] - root[0], vector[1] - root[1], vector[2] - root[2]);

        this.scene.remove(this.pointscloud);
        this.pointscloud.geometry.setAttribute('position', new THREE.Float32BufferAttribute(flat, 3));
        this.pointscloud.geometry.setDrawRange(0, this.Vectors.length);
        this.pointscloud.geometry.verticesNeedUpdate = true;
        this.pointscloud.geometry.computeBoundingSphere();

        this.pointscloud.position.set(...root);
        this.scene.add(this.pointscloud);
    }

    undo(index) {
        if (!index) {
            this.Vectors.pop();
            this.Points.pop();
        }

        if (index) {
            this.Vectors.splice(index, 1)
            this.Points.splice(index, 1)[0];
        }

        if (this.Line) this.removeLine();
        if (this.Polygon) this.removePolygon();

        if (this.geomType == "Line" && this.Vectors.length > 1) {
            let line = new Line(this.Vectors, { material: DrawHelper.lineMaterial });
            this.scene.add(line.model);
            this.Line = line;
            this.Line.model.userData = this;
        }

        if (this.geomType == "Polygon" && this.Vectors.length > 2) {
            let polygon = new Polygon([this.Vectors], { material: DrawHelper.meshMaterial });
            if (!this.Polygon) this.scene.add(polygon.model);
            this.Polygon = polygon;
            this.Polygon.model.userData = this;
        }

        this.updatePoints();
    }

    clear() {
        this.removePolygon();
        this.removeLine();
        this.removePoints();

        this.Vectors = [];
    }

    removePolygon() {
        if (this.Polygon) {
            this.Polygon.model.geometry.dispose();
            this.scene.remove(this.Polygon.model);
            this.Polygon = undefined;
        }
    }

    removeLine() {
        if (this.Line) {
            this.Line.model.geometry.dispose();
            this.scene.remove(this.Line.model);
            this.Line = undefined;
        }
    }

    removePoints() {
        if (this.Points) {
            this.Points = [];
        }

        this.scene.remove(this.pointscloud);
    }

    convertPositionsToVectors(positions) {
        let vectors = [];

        for (let [x, y, z] of positions) {
            vectors.push(new THREE.Vector3(x, y, z));
        }

        return vectors;
    }
}