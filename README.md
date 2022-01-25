### Spotify Album Finder 

Demo : https://spotify-album-finder.herokuapp.com/


- Created a HTTP Server with vanilla Node.js (no express)

- Parsing URLs and Query Strings

- Creating HTTP Requests and processing HTTP Responses

- REST APIs
    - utilzied Spotify's OAuth 2.0 Client credentials Authentication to access album data from Spotify API
    - To get Spotify to accept our queries the application needs to identify itself by sending it's client_id and secret.  There are three different types of authorization flows, (Authorization Code, Implicit Grant, and Client Credentials) each which serve a different purpose. 
    - https://developer.spotify.com/documentation/general/guides/authorization/
    - Client Credential allows us to access resources that are independent of any particular user.  In our example album info does not change from user to user.  In contrast, if we were to try to access a particular Spotify user's personal playlists, we would need to explicitly ask for permission from that user (using either Authorization Code or Implicit Grant).  


- Utilized Caching to store the the access token for 1 hour

