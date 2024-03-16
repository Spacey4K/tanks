const REFRESH_RATE = 120;
const CANVAS = {
	w: 1920,
	h: 1080,
};

const WebSocket = require('ws');
const crypto = require('crypto');

const wss = new WebSocket.Server({ noServer: true, path: '/ws' });

wss.broadcast = (data) => {
	wss.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(data));
	});
};

wss.objs = {}; // TODO map 
// TODO bullets own array? 

wss.on('connection', (ws) => {
	console.log('Connection made');

	if (!wss.interval) {
		wss.interval = setInterval(() => {
			handleUpdates();
			wss.broadcast({
				event: 'UPDATE_OBJECTS',
				packet: wss.objs
			});
		}, 1000 / REFRESH_RATE);
	}

	ws.id = crypto.randomUUID();

	ws.on('message', (data) => {
		const { event, packet } = JSON.parse(data.toString());

		switch (event) {
			case 'PLAYER_JOIN': {
				const { color, username } = packet;

				wss.objs[ws.id] = {
					lastUpdate: performance.now(),
					lastFire: 0,
					fireRate: 350,
					type: 'TANK',
					username,
					x: CANVAS.w / 2,//~~(Math.random() * 1000),
					y: CANVAS.h / 2,//~~(Math.random() * 1000),
					a: 40,
					speed: .3,
					bulletSpeed: .75,
					/* acceleration: .5,
					maxSpeed: 2,
					friction: .02, */
					health: 100,
					kills: 0,
					turret: {
						angle: 0,
						length: 80,
						width: 30,
					},
					color,
					bullets: [],
				};

				console.log(`Player ${ws.id} joined`);
			} break;
			case 'PLAYER_UPDATE': {
				const previousUpdate = wss.objs[ws.id].lastUpdate;
				const delta = performance.now() - previousUpdate;

				if (delta > 1000 / REFRESH_RATE) {
					handleInput(packet, ws.id, delta);

					wss.objs[ws.id].lastUpdate = performance.now();
				}
			} break;
		}
	});

	ws.on('close', () => {
		if (wss.objs[ws.id]) delete wss.objs[ws.id];

		if (wss.clients.size == 0) {
			clearInterval(wss.interval);
			wss.interval = null;
		}

		console.log('Connection lost');
	});
});

function handleInput({ actions, mousePos }, id, delta) {
	const speed = wss.objs[id].speed * delta;
	const size = wss.objs[id].a;

	if (actions.includes('MOVE_UP') && wss.objs[id].y - speed - size > 0) {
		wss.objs[id].y -= speed;
	}
	else if (actions.includes('MOVE_DOWN') && wss.objs[id].y + speed + size < CANVAS.h) {
		wss.objs[id].y += speed;
	}

	if (actions.includes('MOVE_LEFT') && wss.objs[id].x - speed - size > 0) {
		wss.objs[id].x -= speed;
	}
	else if (actions.includes('MOVE_RIGHT') && wss.objs[id].x + speed + size < CANVAS.w) {
		wss.objs[id].x += speed;
	}

	wss.objs[id].turret.angle = Math.atan2(mousePos.x - wss.objs[id].x, wss.objs[id].y - mousePos.y);

	if (actions.includes('FIRE') && performance.now() - wss.objs[id].lastFire > wss.objs[id].fireRate) {
		const bulletSpeed = wss.objs[id].bulletSpeed * delta;
		wss.objs[id].bullets.push({
			type: 'BULLET',
			x: wss.objs[id].x,
			y: wss.objs[id].y,
			a: size / 2,
			direction: wss.objs[id].turret.angle,
			speed: bulletSpeed
		});

		wss.objs[id].lastFire = performance.now();
	}
}

function handleUpdates() {
	for (const enemyTankId in wss.objs) {
		if (wss.objs[enemyTankId].type == 'TANK' && !wss.objs[enemyTankId].dead) {
			wss.objs[enemyTankId].bullets.forEach((b, i) => {
				b.y -= ~~(b.speed * Math.cos(b.direction));
				b.x += ~~(b.speed * Math.sin(b.direction));

				for (const tankId in wss.objs) {
					const tank = wss.objs[tankId];
					wss.objs[tankId].hit = performance.now() - wss.objs[tankId].lastHurt < 100;

					if (tankId != enemyTankId && !wss.objs[tankId].dead && checkCollisions(tank.x, tank.y, tank.a, b.x, b.y, b.a)) {
						wss.objs[tankId].health -= 2;
						wss.objs[tankId].lastHurt = performance.now();

						if (wss.objs[tankId].health <= 0) {
							wss.objs[enemyTankId].kills++;

							wss.objs[enemyTankId].health += 50;
							if (wss.objs[enemyTankId].health > 100) wss.objs[enemyTankId].health = 100;

							wss.clients.forEach((client) => {
								if (client.id == tankId) client.send(JSON.stringify({ event: 'PLAYER_DIE' }));
							});
							wss.objs[tankId].dead = true;
						}
					}
				}

				if (!(b.x < CANVAS.w && b.y < CANVAS.h && b.x > 0 && b.y > 0)) wss.objs[enemyTankId].bullets.splice(i, 1); // bullet out of bounds
			});
		}

	}
}

// https://www.jeffreythompson.org/collision-detection/
function checkCollisions(c1x, c1y, c1r, c2x, c2y, c2r) {
	// get distance between the circle's centers
	// use the Pythagorean Theorem to compute the distance
	const distX = c1x - c2x;
	const distY = c1y - c2y;
	const distance = Math.sqrt((distX * distX) + (distY * distY));

	// if the distance is less than the sum of the circle's
	// radii, the circles are touching!
	if (distance <= c1r + c2r) return true;
	return false;
};


module.exports = (httpServer) => {
	httpServer.on('upgrade', (req, socket, head) => {
		wss.handleUpgrade(req, socket, head, (ws) => {
			wss.emit('connection', ws, req);
		});
	});
};