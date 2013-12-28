var http = require('http');
var express = require('express');
var app = express();
var fs = require('fs');
var server = http.createServer(app);

// Initialize main server
app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));
app.use(app.router);
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);

app.get('/', function(req, res){
  res.render('sample2.html');
});


server.listen(1337, function() {
  console.log((new Date()) + " Server is listening on port 1337");
});

