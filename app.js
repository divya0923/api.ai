var express = require('express');
var nano = require('nano')('https://couchdb-9ee129.smileupps.com/');
var app = express();
var filter = nano.db.use('filter');

app.use('/static', express.static(__dirname + '/public'));

app.post('/webhook', function (req, res) {
  
  // read request params from post body
  var postParam = null;
  var response = null;
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

  // if param is null, send default value as response 
  if(postParam == null){
      console.log("post param null");
      response =  {
      "speech": "Okay. Other customers have felt that filter material quality is one of the important things to consider when buying an air filter. In this store Nordic Pure M14 is the best air filter for filter material quality based on customer data and review. Would you like to purchase Nordic pure M14?",
      "displayText": "Filter matching your query is Nordic Pure M14",
      "source": "apiai-filter-search"
    };
  }

  // else fetch results for the user defined attribute 
  else {
    console.log("post param not null");
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
      response =  {
        "speech": "Great, I can help you with that. In this store, " + filterRows[0].value.filterModel + " is the best air filter for " + postParam + " based on customer review and industry data. Would you like to purchase " + filterRows[0].value.filterModel +"?" ,
        "displayText": "Filter matching your query is " + filterRows[0].value.filterModel,
        "source": "apiai-filter-search"
      };
    }
    });
  }

  // post response
  res.contentType('application/json');
	res.send(response); 
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