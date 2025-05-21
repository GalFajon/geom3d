export class EventDispatcher {
    constructor() {
        this.eventDomElement = document.createElement('div');
    }

    addEventListener(name, callback) {
        this.eventDomElement.addEventListener(name, callback);
    }

    removeEventListener(name, callback) {
        this.eventDomElement.removeEventListener(name, callback);
    }

    dispatchEvent(event) {
        this.eventDomElement.dispatchEvent(event);
    }
}