var express = require('express');
var nano = require('nano')('https://couchdb-9ee129.smileupps.com/');
var app = express();
var filter = nano.db.use('filter');

app.post('/webhook', function (req, res) {
  
  // read request params from post body
  var postParam = null;
   if (req.method == 'POST') {
        var jsonString = '';

        req.on('data', function (data) {
            jsonString += data;
        });

        req.on('end', function () {
          postParam = JSON.parse(jsonString).result.parameters.filterAttributes;
          console.log("postParam" + postParam);
        });
    }

  // query data from couchDB through views  
  filter.view('searchFilterDesign', 'searchFilterView', function(err, body) {
  if (!err) {
    
    // get the array of filters from response
    var filterRows = body.rows;
    
    // sort rows based on the request param
    filterRows.sort(function(a, b) {
      return parseFloat(a.value[postParam]) - parseFloat(b.value[postParam]);
    });

    console.log("matching filter model:" +filterRows[0].value.filterModel);
    
    // construct response object
    var response =  {
      "speech": "Filter matching your query is " + filterRows[0].value.filterModel,
      "displayText": "Filter matching your query is " + filterRows[0].value.filterModel,
      "source": "apiai-filter-search"
    }

    // post response
    res.contentType('application/json');
  	res.send(response); 
  }
  }); 
});

app.get('/test', function(req,res){
  res.contentType('application/json');
  filter.view('searchFilterDesign', 'searchFilterView', function(err, body) {
  var attr = "filterMaterialQuality";
  if (!err) {
     var filterRows = body.rows;
     filterRows.sort(function(a, b) {
        return parseFloat(a.value[attr]) - parseFloat(b.value[attr]);
     });
     console.log(filterRows[0].value.filterModel);
     var response =  {
        "speech": "Filter matching your query is " + filterRows[0].value.filterModel,
        "displayText": "Filter matching your query is " + filterRows[0].value.filterModel,
        "source": "apiai-filter-search"
    }
    res.send(response); 
  }
  }); 
});

var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('Example app listening on port 3000!');
});