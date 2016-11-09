// express conf
var express = require('express');
var app = express();

// nano conf 
var nano = require('nano')('https://couchdb-9ee129.smileupps.com/');
var filter = nano.db.use('filter');

// local storage conf 
var LocalStorage = require('node-localstorage').LocalStorage;
localStorage = new LocalStorage('./scratch');

// static files 
app.use('/static', express.static(__dirname + '/public'));

// handle post request to return filter 
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

        // if param is null, send default value as response 
        if(postParam == null){
            console.log("post param null, get default filter flow");

            filter.view('searchFilterDesign', 'attributesRatingView', function(err, body) {
            if (!err) {
              var priority = localStorage.getItem("filterPriority");
              if(priority == null){
                priority = 1;
                localStorage.setItem ("filterPriority", 1);
              }
              else {
                priority = parseInt(priority) + 1;
                localStorage.setItem("filterPriority", priority);
              }

              console.log("priority" + priority);

              // get attribute rating from the response
              var attributes = body.rows[0].value;
              
              // sort based on the attribute priority 
              attributes.sort(function(a, b) {
                return parseFloat(a.priority) - parseFloat(b.priority);
              });

              console.log("attribute with highest priority: " +attributes[priority].name);
              
              filter.view('searchFilterDesign', 'searchFilterView', function(err, body) {
                if (!err) { 
                  // get the array of filters from response
                  var filterRows = body.rows;
                  
                  // sort rows based on the request param
                  filterRows.sort(function(a, b) {
                    return parseFloat(a.value[attributes[0].name]) - parseFloat(b.value[attributes[0].name]);
                  });

                  console.log("matching filter model:" +filterRows[0].value.filterModel);
                  
                  // construct response object
                  response =  {
                    "speech": "Okay, other customers have felt that " + attributes[0].displayName + " is one of the important things to consider when buying an air filter. " + attributes[0].desc + " In this store, " + filterRows[0].value.filterModel + " is the best air filter for " + attributes[0].displayName + " based on customer review and industry data. Would you like to purchase " + filterRows[0].value.filterModel +"?",
                    "displayText": "Filter matching your query is " + filterRows[0].value.filterModel,
                    "source": "apiai-filter-search"
                  };

                  // post response
                  res.contentType('application/json');
                  res.send(response); 
                }
              });
            }
            });
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

            // post response
            res.contentType('application/json');
            res.send(response); 
          }
          });
        } 

        
    });
  }
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

app.get('/setsession',function(req,res){

localStorage.setItem('myFirstKey', 'myFirstValue');
console.log(localStorage.getItem('myFirstKey'));

});

var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('Example app listening on port 3000!');
});