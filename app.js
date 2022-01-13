/*
=-=-=-=-=-=-=-=-=-=-=-=-
Album Art Search
=-=-=-=-=-=-=-=-=-=-=-=-
Student ID:
Comment (Required):

=-=-=-=-=-=-=-=-=-=-=-=-
*/
require('dotenv').config();
const fs  = require('fs');
const http = require('http');
const https = require('https');
const port = process.env.PORT || 3000;
const server = http.createServer(); //create an https server that is used thoughout the app
const querystring = require("querystring");
server.on("request", connection_handler);

const CACHED_TOKEN_DIR = './auth/authentication-res.json';

//this function handles the reququests make to the server. 
//when i type  localHost:3000 and hit enter, this function gets called. 
//res object is a writeable stream.
function connection_handler(req, res){
	console.log(`New Request for ${req.url} from ${req.socket.remoteAddress}`);

	if(req.url === "/"){
		const mainPage = fs.createReadStream("html/main.html");
		res.writeHead(200,{"Content-Type" : "text/html"})
		mainPage.pipe(res); //meain is the read stream. 
	}else if(req.url === "/favicon.ico"){
		const favicon = fs.createReadStream("images/favicon.ico");
		res.writeHead(200,{"Content-Type":"image/x-icon"}) // this forces the output to be a image 
		favicon.pipe(res)
	}else if(req.url === "/images/banner.png"){
		const banner = fs.createReadStream("images/banner.png")
		res.writeHead(200,{"Content-Type":"image/png"})
		banner.pipe(res);
	}else if(req.url.startsWith("/album-art/")){
		/* it checks the url for album-art, if it is then it creates a file stream that processes the image 
		using a callback function called img_ready_handler or img_error_habdler , if there was an error */
		const img_stream = fs.createReadStream(`.${req.url}`); //need to add the . to indicate current firectory. 
		img_stream.on("error",img_error_handler);
		function img_error_handler(err){
			res.writeHead(404, {"Content-Type":"text/plain"});
			res.write("404 image not found");
			res.end();
		}

		img_stream.on("ready",img_ready_handler);
		function img_ready_handler(){
			res.writeHead(200,{"Content-Type":"image/jpeg"});
			img_stream.pipe(res);
		}

	}else if(req.url.startsWith("/search")){
		/* this if statement gets called the second the user clicks the "search" button. This is because in the 
		main.html file, it says "action = search" inside the form tag. if this method looked for /apple, then
		inside the from tag in the html file, it needs to say "action = apple"
		essentailly, this method extracts out what the user typed in.*/
		//this this case req.url is search?artist=whatEveryUserTypedIN
		//the url structure comes from the main.html from tag. 
		const myURL = new URL(req.url,"https://localhost:3000"); //the first param is the url we care about, the second one is the base url, incase the 1st has an issue
		let artist = myURL.searchParams.get("artist");
		if(artist.replace(/\s/g, '').length === 0){
			//the replace method removed all space characters
			artist = "weeknd";
		}
		let cache_valid = false;
		if(fs.existsSync(CACHED_TOKEN_DIR)){
			cached_token_object = require(CACHED_TOKEN_DIR);
			if(new Date(cached_token_object.expiration) > Date.now()){
				cache_valid = true;
			}
		}
		if(cache_valid){
			access_token = cached_token_object.access_token;
			console.log("Cache exists for the current request, no need to request access token")
			create_search_request(access_token,artist,res);
		}else{
			request_access_token(artist,res);
		}
		

	}else{
		res.writeHead(404, {"Content-Type":"text/plain"});
		res.write("404 image not found", ()=> res.end());
			
	}
}

/* takes in user input (ie the artist name) and response object.
it then goes through the   credentials.json files and gets the client_id and client secret 
since the api wants the Authorization in base64 we use the Buffer to convert it to base64 string
then , the things we would put  inside the headers of insomnia, we put that info n the options object (which gets used when
	we make the https request for the token.)
for the data that goes inside the form / body , we set it inside post_data
we then check the token_request https request for an error and response. If there is a response, from the request
we pass in the token stream received from the response and parse it to a token object / message.   */
function request_access_token(artist,res){
	let client_id = process.env.client_id;
	let client_secret = process.env.client_secret;
	let base64data = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
	
	const options = {
		method : "POST",
		headers : {
			"Content-Type" : "application/x-www-form-urlencoded",
			"Authorization" : `Basic ${base64data}`

		}
	}
	const post_data = querystring.stringify({grant_type : "client_credentials"});//this is what goes in form body in insomnia
	const token_endpoint = "https://accounts.spotify.com/api/token";
	const token_request_time = new Date();
	const token_request = https.request(token_endpoint,options);
	token_request.once("error",(err)=> {
		throw err;
	})
	token_request.once("response",(token_stream)=> stream_to_message(token_stream,received_token,artist,token_request_time,res));
	token_request.end(post_data);
}

function stream_to_message(stream, callback, ...args){
	let body = "";
	stream.on("data",(chunk) => body += chunk);
	stream.on("end",() => callback(body,...args));
}

/* the token_object returned has the access_token and the token_type, which we combine 
"token_type + access_token " for type Authorization in the header,  to make a get request to spotify.   */
function received_token(serialized_token_object, artist, token_request_time,res){
	let token_object = JSON.parse(serialized_token_object)
	let access_token = token_object.access_token;
	create_access_token_cache(token_object, token_request_time);
	create_search_request(access_token,artist,res);
}

function create_access_token_cache(token_object,token_request_time){
	token_object.expiration = new Date(token_request_time.getTime() + (token_object.expires_in * 1000));
	console.log("current time",new Date());
	console.log(token_object);
	fs.writeFile(CACHED_TOKEN_DIR,JSON.stringify(token_object), ()=> console.log("Access token cached"));
}

function create_search_request(access_token,artist,res){
	const options = {
		method : "GET",
		headers : {
			"Authorization" : `Bearer ${access_token}`

		}
	}

	const query_data = {
		type: "album",
		q : artist
	}

	const search_query = querystring.stringify(query_data);
	
	const search_endpoint = `https://api.spotify.com/v1/search?${search_query}`;
	const search_request = https.request(search_endpoint,options)
	search_request.once("error",(err)=> {
		throw err;
	})
	search_request.once("response",(search_result_stream)=> stream_to_message(search_result_stream,received_search_result,artist,res));
	search_request.end();
}

function received_search_result(serialized_search_object,artist,res){
	let search_results = JSON.parse(serialized_search_object);
	let albums = search_results.albums.items;
	//let album_art_urls = [];
	let album_info = [];
	for(let i = 0; i <  albums.length; i++){
		//album_art_urls.push(albums[i].images[0].url);
		let album_data = new Object();
		album_data.url = albums[i].images[0].url;
		album_data.name = albums[i].name;
		album_data.release_date = albums[i].release_date;
		album_data.external_url = albums[i].external_urls.spotify;
		album_info.push(album_data);
	}
	
	generate_webpage(album_info,artist,res);
}

function generate_webpage(album_info,artist,res){
	//let image_component = file_path_list_for_images.map(image_path => `<img src="${image_path}"/>`).join("");
	let htmlData = album_html(album_info,artist)
	res.writeHead(200,{"Content-Type":"text/html"});
	res.end(`<h1>${artist}</h1> ${htmlData}`);
}

function album_html(album_info,artist){
	let htmlData = `
	<title>${artist}'s Albums</title>
	<style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins&family=Varela+Round&display=swap');
        *{
            font-family: 'Poppins', sans-serif;
            }
        #heading{
            text-align : center;
        }
        #container{
			text-align: center;
            border-radius : 1px;
            border: none;
            height : 450px;
            width : 30%;
            margin : auto;
            background :linear-gradient(to right, #1DB954,  #059c3a);
            color : white;
            border-radius : 10px;
            box-shadow: 2px 2px 2px 1px rgba(0, 0, 0, 0.3);
            margin-top : 10px;
			float : left;
			margin-left : 2%;
        }
		#container:hover{
			background :linear-gradient(to right, #059c3a,  #1DB954);
			cursor: pointer;
		}

        em{
            color : black;
        }
		#album-art{
			max-width : 90%;
			margin-top : 20px;	
		}
    
    </style>
	
	`;
	for(let i =0; i < album_info.length;i++){
		htmlData += 
		`<div id="container" onclick="window.open('${album_info[i].external_url}','mywindow');">
			<img id="album-art" src="${album_info[i].url}" alt="Album Art" width="300" height="300"> 
			<h3><em>Album Name :</em>  ${album_info[i].name}</h3>
			<h3><em>Release Date :</em>  ${album_info[i].release_date}</h3>
		</div>`
	}

	return htmlData;

}


server.on("listening", listening_handler);
//runs this function when we run the index.js
function listening_handler(){
	console.log(`Now Listening on Port ${port}`);
}

server.listen(port);
