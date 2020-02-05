var fs = require('fs');
var path = require('path');
var https = require('https');
var http = require('http');
var express = require('express');
var app = express();
var server = http.createServer({
  key: fs.readFileSync(path.join(__dirname, 'cert', 'localhost.key')),
  cert: fs.readFileSync(path.join(__dirname, 'cert', 'localhost.crt'))
}, app);

var PORT = 3003;

// Initialize main server
app.set('port', process.env.PORT || PORT);
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.use(express.static(__dirname + '/public', {
  setHeaders: function(res, path, stat) {
    res.header('Access-Control-Allow-Headers', 'Feature-Policy');
    res.set('Feature-Policy', "microphone 'self'");
  }
}));

app.get('/', function(req, res) {
  console.log('hellooo')
  res.header('Access-Control-Allow-Headers', 'Feature-Policy');
  res.set('Feature-Policy', "microphone 'self'");
  res.render('index.html');
});

server.listen(PORT, function() {
  console.log((new Date()) + " Server is listening on port " + PORT);
});
