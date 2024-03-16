import controls from './controls.js';

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("canvas");
/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext("2d");

canvas.width = 1920;
canvas.height = 1080;

let ws;
let currentObjects = {};

const activeKeys = {};
const keyMap = {};
const storedKeyMap = JSON.parse(localStorage.getItem('TI_KEY_BINDS')) || {};
for (const action in controls) {
	const key = storedKeyMap[action] || controls[action];
	keyMap[action] = key;
}

const mousePos = { x: 0, y: 0 };

function init() {
	// ws = new WebSocket('ws://localhost:8080/ws');
	ws = new WebSocket('wss://tanks.spey.si/ws');

	ws.onopen = () => {
		console.log(`Connected to WS server`);

		sendWs({
			event: 'PLAYER_JOIN',
			packet: {
				username: localStorage.getItem('TI_USERNAME'),
				color: localStorage.getItem('TI_COLOR'),
			},
		});

		requestAnimationFrame(animate);
	};

	ws.onmessage = ({ data }) => {
		const { event, packet } = JSON.parse(data.toString());

		switch (event) {
			case 'UPDATE_OBJECTS': {
				currentObjects = packet;
			} break;
			case 'PLAYER_DIE': {
				window.location.href = 'index.html';
			} break;
		}
	};

	ws.onclose = () => {
		console.log('You died!');
	};
}

function sendWs(json) {
	ws.send(JSON.stringify(json));
}

function animate() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	update();
	render(currentObjects);

	requestAnimationFrame(animate);
}

function update() {
	const actions = [];

	for (const action in keyMap) {
		const key = keyMap[action];
		if (activeKeys[key]) actions.push(action);
	}

	sendWs({ event: 'PLAYER_UPDATE', packet: { actions, mousePos } });
}

function render(objects) {
	const players = [];
	const scoreboard = {
		w: 350,
		h: 50,
	};

	const d = {
		pad: 15,
		maxHealth: 100,
		font: 'Arial',
	};

	ctx.lineWidth = 5;
	ctx.lineCap = 'round';
	ctx.strokeStyle = '#797979';

	for (const id in objects) {
		const obj = objects[id];

		if (obj.type == 'TANK') {
			const { x, y, a, color, username, health, turret, bullets, kills, hit } = obj;
			players.push({ username, color, health, kills });

			// bullets 
			bullets.forEach(({ x, y, a }) => {
				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.arc(x, y, a, 0, 2 * Math.PI);
				ctx.fill();
				ctx.stroke();
			});

			// turret
			ctx.fillStyle = '#9e9e9e';
			ctx.translate(x, y);
			ctx.rotate(turret.angle);
			ctx.beginPath();
			ctx.rect(-turret.width / 2, 0, turret.width, -turret.length);
			ctx.fill();
			ctx.stroke();

			ctx.resetTransform();

			// tank body
			ctx.fillStyle = color;

			ctx.beginPath();
			ctx.arc(x, y, a, 0, 2 * Math.PI);
			ctx.fill();
			ctx.stroke();

			// username
			ctx.fillStyle = '#fff';
			ctx.font = `30px ${d.font}`;
			ctx.textBaseline = 'middle';
			ctx.fillText(username, x - ctx.measureText(username).width / 2, y - a - d.pad - 10);

			// health
			ctx.beginPath();
			ctx.fillStyle = hit ? '#cd3232' : 'LimeGreen';
			ctx.rect(x - d.maxHealth / 2, y + a + d.pad, health, 20);
			ctx.fill();

			ctx.beginPath();
			ctx.rect(x - d.maxHealth / 2, y + a + d.pad, d.maxHealth, 20);
			ctx.stroke();
		}
	}

	// player list
	ctx.fillStyle = '#444';
	ctx.textBaseline = 'top';
	ctx.fillRect(canvas.width - scoreboard.w - d.pad, d.pad, scoreboard.w, scoreboard.h + players.length * scoreboard.h);

	ctx.fillStyle = '#fff';
	ctx.font = `30px ${d.font}`;
	ctx.fillText('Players:', canvas.width - scoreboard.w, d.pad * 2);

	ctx.font = `25px ${d.font}`;
	players
		.sort((a, b) => b.kills - a.kills)
		.forEach(({ username, color, health, kills }, i) => {
			ctx.fillStyle = color;
			const txt = `${i + 1}. ${username} | ${kills}K | ${health}/${d.maxHealth}`;
			ctx.fillText(txt, canvas.width - scoreboard.w, scoreboard.h + d.pad * 2 + scoreboard.h * i);
		});
}

function setActiveKey(key, pressed) {
	if (Object.values(keyMap).includes(key)) activeKeys[key] = pressed;

}
function handleKeys(e) {
	setActiveKey(e.key, e.type == 'keydown');
}

/* const laserSound = new Audio('audio/laser.wav');
laserSound.volume = (localStorage.getItem('TI_VOLUME') || 100) / 100; */

function handleShoot(e) {
	// laserSound.play();
	setActiveKey(keyMap.FIRE, e.type == 'mousedown');
}

window.addEventListener('load', init);

window.addEventListener('keyup', handleKeys);
window.addEventListener('keydown', handleKeys);

window.addEventListener('mouseup', handleShoot);
window.addEventListener('mousedown', handleShoot);

window.addEventListener('blur', () => {
	for (const key in activeKeys) {
		activeKeys[key] = false;
	}
});

canvas.addEventListener('mousemove', (e) => {
	mousePos.x = ~~(e.offsetX * canvas.width / canvas.clientWidth);
	mousePos.y = ~~(e.offsetY * canvas.height / canvas.clientHeight);
});