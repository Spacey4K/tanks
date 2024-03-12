import controls from './controls.js';

const volumeDisplay = document.getElementById('volumeValue');
const volumeInput = document.getElementById('volume');
const controlsDisplay = document.getElementById('controls');
const resetButton = document.getElementById('reset');

for (const action in controls) {
	const key = getStoredKeyBinds()[action] || controls[action];

	const div = document.createElement('div');
	div.classList.add('keybind');

	const span = document.createElement('span');
	span.innerText = formatAction(action) + ':';
	div.appendChild(span);

	const keySpan = document.createElement('span');
	keySpan.classList.add('key');
	keySpan.innerText = formatKey(key);
	keySpan.dataset.action = action;
	div.appendChild(keySpan);

	controlsDisplay.appendChild(div);
}

const volume = localStorage.getItem('TI_VOLUME') || 100;
volumeDisplay.innerText = volume;
volumeInput.value = volume;

volumeInput.addEventListener('change', (e) => {
	const { value } = e.target;
	volumeDisplay.innerText = value;
	localStorage.setItem('TI_VOLUME', value);
});

const keys = document.getElementsByClassName('key');
for (const key of keys) {
	key.addEventListener('click', () => {
		[...keys].forEach(k => k.id = '');
		key.id = 'selected';
	});
}

addEventListener('keydown', ({ key }) => {
	const selected = document.getElementById('selected');
	if (selected) {
		selected.innerText = formatKey(key);
		selected.id = '';

		const { action } = selected.dataset;
		const binds = getStoredKeyBinds();
		binds[action] = key;
		localStorage.setItem('TI_KEY_BINDS', JSON.stringify(binds));
	}
});

resetButton.addEventListener('click', () => {
	localStorage.removeItem('TI_VOLUME');
	localStorage.removeItem('TI_KEY_BINDS');

	volumeDisplay.innerText = 100;
	volumeInput.value = 100;

	for (const key of keys) {
		key.innerText = formatKey(controls[key.dataset.action]);
	}
});

function formatAction(action) {
	return action.toLowerCase().replace('_', ' ');
}

function formatKey(key) {
	return key
		.replace(' ', 'Space');
}

function getStoredKeyBinds() {
	return JSON.parse(localStorage.getItem('TI_KEY_BINDS')) || {};
}