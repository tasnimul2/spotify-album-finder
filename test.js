require('dotenv').config();
let client_id = process.env.client_id;
let client_secret = process.env.client_secret;

let base64data = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
console.log(`Basic ${base64data}`);