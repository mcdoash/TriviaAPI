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

app.get("/questions", queryParser);
app.get("/questions", isValidToken);
app.get("/questions", getQuestions);
app.get("/questions", sendQuestions);

app.post("/sessions", newSession);
app.get("/sessions", getSessions);
app.delete("/sessions/:sessionid", deleteSession);

//general 404

/*

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
    else if (!Number.isInteger(req.query.difficulty) || req.query.difficulty < 1  req.query.difficulty > 3) {
        req.query.difficulty = null;
    }
    //category not specified, set to null
    if(!req.query.category){
		req.query.category = null;
	}
    //invalid category if not an integer or not 1-24
    else if (!Number.isInteger(req.query.category) || req.query.category < 1  req.query.category > 24) {
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
        //get array of all question files
        let files = fs.readdirSync(qFolder);
        
        //create a random starting point
        //let randIndex = Math.floor(Math.random() * (files.length-limit)) + 1;
        let randIndex = 375;
        let i = randIndex;
        
        //RANDOM QUESTION

        //iterate through files in directory until enough questions are gathered
        while(questions.length < limit) {
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
                file = sessionFolder + "/" + token + ".json";
                data = fs.readFileSync(file);

                //get array of questions already recieved
                let qRecieved = JSON.parse(data);
                
                //check of this question has already been recieved, don't add if so
                for(let j=0; j<qRecieved.questions.length; j++) {
                    if(qRecieved.questions[j] == files[i]) {
                        addQ = false;
                        break;
                    }
                }

                //add question to session
                if(addQ) {
                    qRecieved.questions.push(files[i]);
                    fs.writeFileSync(file, JSON.stringify(qRecieved));
                }
            }

            //add to question array if all clear
            if(addQ) {
                questions.push(q)
            }

            //increase index if not at end
            if(i < (files.length-1)) {
                i++;
            }
            //loop back to the beginning if at end
            else {
                i = 0;
            }
            //if looped through all files, break
            if(i == randIndex) {
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
        }
    }
    next();
}


/*
Sends the response, which is a json object containing:
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
Creates a new session by creating a new file to hold session questions
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

*/
function getSessions(req, res, next) {
    let content = [];
    
    fs.readdirSync(sessionFolder).forEach(function(file) {
        try {
            let data = fs.readFileSync(sessionFolder + "/" + file);
            let session = JSON.parse(data);

            content.push(session.token);
        }
        catch(err) {
            console.log(err);
        }
        //.DS_Store file
    });

    res.writeHead(200, {"Content-Type": "application/json"});
    res.write(JSON.stringify(content));
    res.end();
    next();
}


/*
Deletes a specified session
*/
function deleteSession(req, res, next) {
    let token = req.params.sessionid;
    let file = sessionFolder + "/" + token + ".json";
        
    //try removing id in request
    try {
        fs.unlinkSync(file);
        console.log("Session " + token + " removed")
        
        //send success status
        res.status(200).end();
    }
    //session did not exist, send 404
    catch(err) {
        res.status(404).end();
    }
    next();
}


//start server
server.listen(3000);
console.log("Server running on port 3000");