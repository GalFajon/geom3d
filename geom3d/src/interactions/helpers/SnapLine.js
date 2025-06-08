import { Geometry } from '../../geometry/Geometry.js';
import { viewer, THREE } from '../../misc/DependencyManager.js';

export class SnapLine extends Geometry {
    static material = new THREE.LineBasicMaterial({ color: 'yellow', transparent: true, opacity: 0 });

    constructor(positions, referencedObject) {
        super();

        let threeVectors = this.convertPositionsToVectors(positions);
        let geometry = new THREE.BufferGeometry().setFromPoints(threeVectors);

        this.model = new THREE.Line(geometry, SnapLine.material);
        this.model.visible = false;
        
        this.refersTo = referencedObject;
        this.model.userData = this;
    }

    convertPositionsToVectors(positions) {
        let vectors = [];

        for (let [x, y, z] of positions) vectors.push(new THREE.Vector3(x, y, z));

        return vectors;
    }

    attachToScene() {
        viewer.scene.scene.add(this.model);
    }

    removeFromScene() {
        viewer.scene.scene.remove(this.model);
    }
}