// express conf
var express = require('express');
var app = express();

// nano conf 
var nano = require('nano')('https://couchdb-c0e747.smileupps.com/');
var filter = nano.db.use('filter');

// local storage conf 
var LocalStorage = require('node-localstorage').LocalStorage;
localStorage = new LocalStorage('./scratch');

// static files 
app.use('/static', express.static(__dirname + '/public'));

// handle post request to return filter 
app.post('/webhook', function (req, res) {
  // read request params from post body
  var action = null;
  var postParam = null;
  var brand = null, any = null;
  var contextName = null;
  var response = null;
  if (req.method == 'POST') {
      var jsonString = '';

      req.on('data', function (data) {
          jsonString += data;
      });

      req.on('end', function () {
        action = JSON.parse(jsonString).result.action;
        console.log("action :" + action);
        postParam = JSON.parse(jsonString).result.parameters.filterAttributes;
        brand = JSON.parse(jsonString).result.parameters.brand;
        any = JSON.parse(jsonString).result.parameters.any;
        contextName = JSON.parse(jsonString).result.contexts[0].name;
        console.log("postParam: " + postParam + "name :" + contextName);

        if(brand != null || any != null){
           gotoSatFlow(jsonString, req, res);
        }

        else if(action == "searchBrandWithoutAttr"){
           gotoSearchBrandWithoutAttr(jsonString, req, res);
        }
        
        // if param is null, send default value as response 
        else if(postParam == null){
            console.log("post param null, get default filter flow");

            filter.view('searchFilterDesign', 'attributesRatingView', function(err, body) {   
              if (!err) {

                // get attribute rating from the response
                var attributes = body.rows[0].value;

                var prevContext = localStorage.getItem("prevContext");
                console.log("prevContext" + prevContext);
                // read priority from local storage
                var priority = localStorage.getItem("filterPriority");
                if(prevContext == contextName){
                   priority = parseInt(priority) + 1;
                }
                else {
                  priority = 0;
                }

                if(priority > body.rows[0].value.length - 1 || priority < 0){
                  console.log("invalid value for priority, defaulting it to 1");
                  priority = 0;
                }

                localStorage.setItem("filterPriority", priority);

                console.log("priority" + priority);

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
                      return parseFloat(a.value[attributes[priority].name]) - parseFloat(b.value[attributes[priority].name]);
                    });

                    console.log("matching filter model:" +filterRows[0].value.filterModel);
                    
                    // construct response object
                    response =  {
                      "speech": "Okay, other customers have felt that " + attributes[priority].displayName + " is one of the important things to consider when buying an air filter. " + attributes[priority].desc + " In this store, " + filterRows[0].value.filterModel + " is the best air filter for " + attributes[priority].displayName + " based on customer review and industry data. Would you like to purchase " + filterRows[0].value.filterModel +"?",
                      "displayText": "Filter matching your query is " + filterRows[0].value.filterModel,
                      "source": "apiai-filter-search"
                    };

                    localStorage.setItem("prevContext", contextName);
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
            
            if(filterRows[0].value.hasOwnProperty(postParam))           
              response =  {
                "speech": "Great, I can help you with that. In this store, " + filterRows[0].value.filterModel + " is the best air filter for " + postParam + " based on customer review and industry data. Would you like to purchase " + filterRows[0].value.filterModel +"?" ,
                "displayText": "Filter matching your query is " + filterRows[0].value.filterModel,
                "source": "apiai-filter-search"
              };
            else
              response =  {
                "speech": "I am sorry. We dont have any products that match your description. Can you please describe it in another way?",
                "displayText": "Filter not found",
                "source": "apiai-filter-search"
              };

            localStorage.setItem("prevContext", contextName);

            // post response
            res.contentType('application/json');
            res.send(response); 
          }
          });
        }         
    });
  }
});

var gotoSatFlow = function(postParam, req, res){
  var brand = JSON.parse(postParam).result.parameters.brand;
  var response = "";
  console.log("brand :" + brand);
  filter.view('searchFilterDesign', 'searchBrandView', function(err, body) {   
    if (!err) {
        var brandRows = body.rows;
        for(var i = 0; i < brandRows.length; i++ ) { 
          console.log("brand in loop :" + brandRows[i].value.name);
          console.log(brandRows[i].value.name.toLowerCase() == brand.toLowerCase());
          if(brandRows[i].value.name.toLowerCase() == brand.toLowerCase()){
            response =  {
                "speech": "Great, I can help you with that. We have multiple " + brandRows[i].value.displayName + " filters in this store, located at " +  brandRows[i].value.shelf + ". Would you like to make a purchase?" ,
                "displayText": "Brand matching the query is " + brandRows[i].value.name,
                "source": "apiai-filter-search"
              };
          }
        }

        if(response == ""){
          response = { 
                "speech": "I'm sorry. I did not recognize what you said. Would you like to make a purchase?" ,
                "displayText": "Unrecognizable Input", 
                "source" :  "apiai-filter-search"
            }; 
        }
      }
    
      res.contentType('application/json');
      res.send(response); 
    
  });
};

var gotoSearchBrandWithoutAttr = function(postParam, req, res){
  var brand = JSON.parse(postParam).result.context.parameters.brand;
  var response = {
                "speech": "Okay. Do you have any criteria for " + brand + " air filter?" ,
                "displayText": "Brand matching the query is " + brand,
                "source": "apiai-filter-search"
              };

  res.contentType('application/json');
  res.send(response);
}

var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('Example app listening on port 3000!');
});