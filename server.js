const express = require("express");
const uuid = require("uuid/v4");
const fs = require('fs');
const qFolder = "./questions";
const sessionFolder = "./sessionsgit ";

//create server
let app = express();
const server = require("http").createServer(app);

//serve static files
app.use(express.static("public"))

app.get("/questions", queryParser);
app.get("/questions", getQuestions);
app.get("/questions", sendQuestions);

app.post("/sessions", newSession);


/*

*/
function queryParser(req, res, next){
    if(!req.query.limit){
		req.query.limit = 10; //default
	}
    if(!req.query.difficulty){
		req.query.difficulty = null;
	}
    if(!req.query.category){
		req.query.category = null;
	}
    if(!req.query.token){
		req.query.token = null;
	}
	next();
}


/*
Gets all 
*/
function getQuestions(req, res, next) {
    let questions = [];
    
    //get parameters from request
    let limit = req.query.limit;
    let difficulty = req.query.difficulty;
    let category = req.query.category;
    let token = req.query.token;
    
    //check for valid token
    if(token != null) {
        
    }
    
    
    //get all files in directory
    fs.readdir(qFolder, function(err, files) {
        //create a random starting point
        let randIndex = Math.floor(Math.random() * (files.length-limit)) + 1;
        let i = randIndex;
        
        //iterate through files in directory until enough questions are gathered
        while(questions.length < limit) {
            //get and parse data from file at index i
            let file = qFolder + "/" + files[i];
            let data = fs.readFileSync(file);
            let q = JSON.parse(data);
            
            //add question by default
            let addQ = true;
            
            if(difficulty != null) {
                if(difficulty != q.difficulty_id) {
                    addQ = false;
                }
            }
            if(category != null) {
                if(category != q.category_id) {
                    addQ = false;
                }
            }
            if(token != null) {

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
        //invalid token
        else if(false) {
            
        }
        //everything ok
        else {
            res.status = 0;
            res.questions = questions;
        }
        next();
    });
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


function newSession(req, res, next) {
    let tokenID = uuid().toString()
    let file = sessionFolder + "/" + tokenID + ".json";
    let content = {token: tokenID, questions: []};
    
    fs.writeFileSync(file, JSON.stringify(content));
    
    file = sessionFolder + "/validTokens.json";
    try {
        let tokenList = fs.readFileSync(file);
        JSON.parse(tokenList);
        tokenList.push(tokenID); 
        fs.writeFileSync(file, JSON.stringify(tokenList));
    }
    catch(err) {
        fs.writeFileSync(file, JSON.stringify(tokenID));
    }
    
    res.writeHead(201, {"Content-Type": "text/plain"});
    res.write(tokenID);
    res.end();
    next();
}


//start server
server.listen(3000);
console.log("Server running on port 3000");