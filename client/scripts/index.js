const usernameInput = document.getElementById('username');
const colorInput = document.getElementById('color');

usernameInput.value = localStorage.getItem('TI_USERNAME');
colorInput.value = localStorage.getItem('TI_COLOR') || getRandomColor();

usernameInput.addEventListener('change', (e) => {
	localStorage.setItem('TI_USERNAME', e.target.value);
});

colorInput.addEventListener('change', (e) => {
	localStorage.setItem('TI_COLOR', e.target.value);
});

function getRandomColor() {
	return '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, 0);
}