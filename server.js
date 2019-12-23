//import packages
const express = require("express");
const uuid = require("uuid/v4");
const fs = require('fs');

//define folder paths
const qFolder = "./questions";
const sessionFolder = "./sessions";

//create server
let app = express();
const server = require("http").createServer(app);

//serve static files
app.use(express.static("public"))

//handle questions
app.get("/questions", queryParser);
app.get("/questions", isValidToken);
app.get("/questions", getQuestions);
app.get("/questions", sendQuestions);

//handle sessions
app.post("/sessions", newSession);
app.get("/sessions", getSessions);
app.delete("/sessions/:sessionid", deleteSession);


/*
Parses the response for invalid query parameters
*/
function queryParser(req, res, next){
    //set to default 10 if limit not specified or < 1
    if(!req.query.limit || req.query.limit < 1){
		req.query.limit = 10; 
	}
    //difficulty not specified, set to null
    if(!req.query.difficulty){
		req.query.difficulty = null;
	}
    //invalid difficulty if not an integer or not 1-3
    else if (req.query.difficulty != parseInt(req.query.difficulty, 10) || req.query.difficulty < 1 || req.query.difficulty > 3) {
        req.query.difficulty = null;
    }
    //category not specified, set to null
    if(!req.query.category){
		req.query.category = null;
	}
    //invalid category if not an integer or not 1-24
    else if (req.query.category != parseInt(req.query.category, 10) || req.query.category < 1 || req.query.category > 24) {
        req.query.category = null;
    }
    //token not specified, set to null
    if(!req.query.token){
		req.query.token = null;
	}
	next();
}


/*
Checks to see if requested token is valid, if it exists
*/
function isValidToken(req, res, next) {
    //if token was given, check if valid
    if(req.query.token != null) {
        let validToken = false;
        let tokenID = req.query.token + ".json"; //to match file names

        //check each file for corresponding file name
        fs.readdirSync(sessionFolder).forEach(function(file) {
            if(tokenID == file) {
                validToken = true;
            }
        });
        req.validToken = validToken;
    }
    next();
}


/*
Gets questions according to request query 
*/
function getQuestions(req, res, next) {
    let questions = [];
    
    //get parameters from request
    let limit = req.query.limit;
    let difficulty = req.query.difficulty;
    let category = req.query.category;
    let token = req.query.token;
    
    //if invalid token, stop here
    if(token != null && !req.validToken) {
        res.status = 2;
    }
    //otherwise get questions
    else {
        //set up token question data
        let tokenQs;
        let tokenFile;
        let qsToAdd = [];
        if(token != null) {
            //read token file
            tokenFile = sessionFolder + "/" + token + ".json";
            let tokenData = fs.readFileSync(tokenFile);

            //get array of questions already received
            tokenQs = JSON.parse(tokenData);
        }
        
        //get array of all question files
        let files = fs.readdirSync(qFolder);
        //randomize questions
        for(let i=files.length-1; i>0; i--) {
            let rand = Math.floor(Math.random() * i);
            let temp = files[rand];
            files[rand] = files[i];
            files[i] = temp;
        }
        
        //iterate through files in directory until enough questions are gathered
        for(let i=0; i<files.length; i++) {
            //get and parse data from file at index i
            let file = qFolder + "/" + files[i];
            let data = fs.readFileSync(file);
            let q = JSON.parse(data);
            
            //add question by default
            let addQ = true;

            //check for matching difficulty
            if(difficulty != null) {
                if(difficulty != q.difficulty_id) {
                    addQ = false;
                }
            }
            //check for matching category
            if(category != null) {
                if(category != q.category_id) {
                    addQ = false;
                }
            }
            //handle session
            if(token != null) {
                //check of this question has already been received, don't add if so
                for(let j=0; j<tokenQs.questions.length; j++) {
                    if(tokenQs.questions[j] == q.question_id) {
                        addQ = false;
                        break;
                    }
                }
                //set question to add to session
                if(addQ) {
                    qsToAdd.push(q.question_id);
                }
            }

            //add to question array if all clear
            if(addQ) {
                questions.push(q)
            }

            //if enough questions gathered, break
            if(questions.length == limit) {
                break;
            }
        }
        //not enough questions
        if(questions.length < limit) {
            res.status = 1;
        }
        //everything ok
        else {
            res.status = 0;
            res.questions = questions;
            
            //add questions to token
            if(token != null) {
                for(let i=0; i<qsToAdd.length; i++) {
                    tokenQs.questions.push(qsToAdd[i]);
                }
                fs.writeFileSync(tokenFile, JSON.stringify(tokenQs));
            }
        }
    }
    next();
}


/*
Sends the question response, which is a json object containing:
    status      the status of the response
                0 if successful
                1 if not enough questions/no results
                2 if invalid token
    results     an array of questions objects corresponding to the query parameters
*/
function sendQuestions(req, res, next) { 
    res.writeHead(200, {"Content-Type": "application/json"});
    res.write(JSON.stringify({status: res.status, results: res.questions}));
    res.end();
    
    next();
}


/*
Creates a new session by creating a new file to hold session data. Response is the newly created unique session id
*/
function newSession(req, res, next) {
    //create unique id
    let tokenID = uuid().toString();
    
    //write new file
    let file = sessionFolder + "/" + tokenID + ".json";
    let content = {token: tokenID, questions: []};
    fs.writeFileSync(file, JSON.stringify(content));
    
    console.log("Created new session " + tokenID);
    
    //send response
    res.writeHead(201, {"Content-Type": "text/plain"});
    res.write(tokenID);
    res.end();
    
    next();
}


/*
Gets all active sessions on the server
*/
function getSessions(req, res, next) {
    let content = [];
    
    fs.readdirSync(sessionFolder).forEach(function(file) {
        try {
            let data = fs.readFileSync(sessionFolder + "/" + file);
            let session = JSON.parse(data);

            content.push(session.token);
        }
        //in case of .DS_Store file, etc.
        catch(err) {
            console.log("Junk file " + file + " found in /sessions");
        }
    });

    //send success & tokens
    res.writeHead(200, {"Content-Type": "application/json"});
    res.write(JSON.stringify(content));
    res.end();
    
    next();
}


/*
Deletes a specified session if it exists
*/
function deleteSession(req, res, next) {
    //get token file
    let token = req.params.sessionid;
    let file = sessionFolder + "/" + token + ".json";
        
    //try removing id in request
    try {
        fs.unlinkSync(file);
        console.log("Session " + token + " removed")
        
        //send success status
        res.writeHead(200, {"Content-Type": "text/plain"});
        res.write("Session successfully deleted");
        res.end();
    }
    //session did not exist, send 404
    catch(err) {
        res.writeHead(404, {"Content-Type": "text/plain"});
        res.write("Session does not exist");
        res.end();
    }
    next();
}


//start server
server.listen(3000);
console.log("Server running on port 3000");