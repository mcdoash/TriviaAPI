# TriviaAPI
Server providing an API to access trivia questions from a database.

<hr/>
### GET /questions
Retrieves trivia questions from the server. <br/>
#### Query Parameters
**limit:** integer number of questions to be returned<br/>
**difficulty:** integer difficulty (1-3) of questions to be returned<br/>
**category:** integer category ID of questions to be returned<br/>
**limit:** string session ID
#### Response
**status:** 0 - success, 1 - no results/not enough results, 2 - invalid token<br/>
**results:** array of question objects
<hr/>

### POST /sessions
Creates a new session on the server.
#### Response
The new session ID.
<hr/>

### GET /sessions
#### Response
Array of all active session IDs.
<hr/>

### DELETE /sessions/:sessionid
Deletes session :sessionid.