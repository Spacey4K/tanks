const PORT = 8080;

const express = require('express');
const app = express();

const httpServer = app.listen(PORT, () => console.log(`HTTP server running on ${PORT}`));
require('./ws.js')(httpServer);
app.use(express.static('client'));

/* app.get('/', (req, res) => {
	res.send('Hello World!');
}); */
