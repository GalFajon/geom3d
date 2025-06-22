export default class ChallengeModal {
    constructor(markup) {
        // DOM stuff
        this.markup = ``;

        let modal = document.createElement('div');

        modal.classList = 'modal';

        let container = document.createElement('div');

        container.classList = 'modal-content';
        container.innerHTML = `
            ${markup}
            <hr>
            <p>
            Kontrole:
                <ul>
                    <li>levi klik -> dodaj točko</li>
                    <li>desni klik -> dodaj geometrijo</li>
                    <li>Z -> odstrani najbolj nedavno točko</li>
                    <li>Escape -> odstrani do zdaj narisano geometrijo</li>
                </ul>
            </p>
            <hr>
        `;

        let button = document.createElement('button');
        
        button.innerText = 'Počakaj...';
        button.style.backgroundColor = 'red';

        let r = this;

        setTimeout(() => {
            button.style.backgroundColor = 'green';
            button.innerText = 'Začni';
            button.onclick = () => {
                document.body.removeChild(modal);
                r.start();
            }
        }, 3000);

        modal.appendChild(container);
        container.appendChild(button);

        document.body.appendChild(modal);

        this.modal = modal;
        this.container = container;
        this.button = button;

        // timer, geojson
        this.timer = 0;

    }

    start() {
        // start timer
        let r = this;

        let endButton = document.createElement('button');
            
        endButton.innerText = 'Zakljuci';
        endButton.style.backgroundColor = 'green';

        document.getElementById('timer').appendChild(endButton);

        this.t = setInterval(() => {
            r.timer += 100;
            document.getElementById('timerInfo').innerText = `Cas: ${r.timer / 1000}`;
        }, 100)

        document.addEventListener('keydown', (e) => {
            if (e.key == 'Enter') {
                r.end(r.timer);
            }
        })

        endButton.onclick = () => { 
            r.end(r.timer) 
        };        
    }

    end() {
        // save geojson + timer data
        clearInterval(this.t);
        const event = new CustomEvent("end", { detail: this.timer });
        this.modal.dispatchEvent(event);
    }
}