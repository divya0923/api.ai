var express = require('express');
var nano = require('nano')('https://couchdb-9ee129.smileupps.com/');
var app = express();
var filter = nano.db.use('filter');

app.get('/', function (req, res) {
  console.log(req.query.key);
  res.contentType('application/json');
  filter.view('searchFilterDesign', 'searchFilterView', function(err, body) {
  if (!err) {
    /*.rows.forEach(function(doc) {
      console.log(doc.value);
    }); */
  	res.send(body); 
  }
  }); 
 //res.send("Hello World");
});

var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('Example app listening on port 3000!');
});