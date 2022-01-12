const {client_id, client_secret} = require('./auth/credentials.json');

let base64data = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
console.log(`Basic ${base64data}`);