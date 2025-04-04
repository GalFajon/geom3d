export class EventDispatcher {
    constructor() {
        this.domElement = document.createElement('div');
    }

    addEventListener(name, callback) {
        this.domElement.addEventListener(name, callback);
    }

    removeEventListener(name, callback) {
        this.domElement.removeEventListener(name, callback);
    }

    dispatchEvent(event) {
        this.domElement.dispatchEvent(event);
    }
}