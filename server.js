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




// create the server
var BinaryServer = require('binaryjs').BinaryServer;

// Start Binary.js server
var bs = BinaryServer({server: server});
// Wait for new user connections
bs.on('connection', function(client){
  console.log('connected');
  client.on('error',function() {
    console.log('error')
    console.log(arguments);
  });
  client.on('client:ready',function() {
    console.log('client signal')
    client.send('server:ready');
  });
  client.on('stream', function(stream, meta){
    console.log('steraming');
    console.log(meta)
    var file = fs.createWriteStream(__dirname + '/public/' + meta.name);
    stream.pipe(file);
  
    stream.on('data',function(data) {
      stream.write({rx: data.length / meta.size});
    });
  });
});

server.listen(1337, function() {
  console.log((new Date()) + " Server is listening on port 1337");
});

