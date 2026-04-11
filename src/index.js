require('dotenv').config();
const { createApp } = require('./app');

const app = createApp();

const port = process.env.PORT || 8080;

app.listen(port, () => {
    console.log('Listening on port ', port, app.get('env'));
});
