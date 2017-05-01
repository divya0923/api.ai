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

// arrays for criteria 
var lessThanCriteria = ["below", "under", "at most", "lower than", "underneath", "beneath", "less than", "smaller than", "maximum"];
var greaterThanCriteria = ["bigger than", "larger than", "at least", "above", "over", "more than", "higher than", "beyond", "greater than", "minumum"];
var betweenCriteria = ["in the middle of", "between"];

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

        /*if(brand != null || any != null){
           gotoSatFlow(jsonString, req, res);
        }*/

        if(action == "searchBrandWithoutAttr") {
          searchBranchWithoutAttr(jsonString, req, res);
        }

        else if(action == "searchBrandWithoutAttrNo"){
          searchBrandWithoutAttrNo(jsonString, req, res);
        }

        else if(action == "searchBrandWithoutAttrNo2"){
          searchBrandWithoutAttrNo2(jsonString, req, res);
        }

        else if(action == "searchBrandWithQuantitativeAttr"){
          searchBrandWithQuantitativeAttr(jsonString, req, res);
        }

        else if(action == "searchBrandWithQuantitativeAttrNo"){
          searchBrandWithQuantitativeAttrNo(jsonString, req, res);
        } 

        else if(action == "searchBrandWithNonQuantitativeAttr"){
          searchBrandWithNonQuantitativeAttr(jsonString, req, res);
        }

        else if(action == "searchBrandWithCriteria") {
          searchBrandWithCriteria(jsonString, req, res);
        }

        else if(action == "searchBrandWithCriteriaWithoutBrand") {
          searchBrandWithCriteria(jsonString, req, res);
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

var searchBranchWithoutAttr = function(postParam, req, res) {
  console.log("searchBranchWithoutAttr");
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
 
var searchBrandWithoutAttrNo = function(postParam, req, res) {
  console.log("searchBrandWithoutAttrNo");
  var brand = JSON.parse(postParam).result.contexts[0].parameters.brand;
  var response = {
                "speech": "Okay. Do you have any criteria for " + brand + " air filter?" ,
                "displayText": "Brand matching the query is " + brand,
                "source": "apiai-filter-search"
              };

  res.contentType('application/json');
  res.send(response);
}

var searchBrandWithoutAttrNo2 = function(postParam, req, res) {
  console.log("searchBrandWithoutAttrNo2");
  var brand = JSON.parse(postParam).result.contexts[0].parameters.brand;
  console.log("brand: " + brand);
  if(brand == "3m") 
    brand = "filtrete";
  filter.view('searchFilterDesign', 'attributesRatingView', function(err, body) {   
    if (!err) {
      var agentRecAttr = body.rows[0].value[0];
      console.log("agentRecAttr %o" , agentRecAttr);
      filter.view('searchFilterDesign', 'searchBrandWithAttrView', { key: brand }, function(err1, body1) {  
        if(!err1){
          var brandData = body1.rows[0].value;
          console.log("brandData %o", brandData);
          var modelMedium = brandData.model_medium[agentRecAttr.name.toLowerCase()];
          var shelf = brandData.shelf;
          console.log("modelMedium: " + modelMedium);
          var response = {
                    "speech": "Okay. Other customers have felt that " +  agentRecAttr.displayName +" is one of the most important things when considering a " + brand + " air filter. "  + agentRecAttr.desc + " In this store, " + modelMedium + " is a reasonably good air filter for " + agentRecAttr.displayName + " based on customer review and industry data. This model is located at " + shelf + ". Would you like to purchase this model?" ,
                    "displayText": "Great, I can help you with that. Do you have any minimum criteria for " + brand + " air filter with " + agentRecAttr.name + "?" ,
                    "source": "apiai-filter-search"
                  };

          res.contentType('application/json');
          res.send(response);
        }
      });
    }
  });
}

var searchBrandWithQuantitativeAttr = function(postParam, req, res) {
  console.log("searchBrandWithQuantitativeAttr");
  var brand = JSON.parse(postParam).result.parameters.brand;
  var attribute = JSON.parse(postParam).result.parameters.quantitativeAttr;
  var response = {
                "speech": "Great, I can help you with that. Do you have any minimum criteria for " + brand + " air filter with " + attribute + "?" ,
                "displayText": "Great, I can help you with that. Do you have any minimum criteria for " + brand + " air filter with " + attribute + "?" ,
                "source": "apiai-filter-search"
              };

  res.contentType('application/json');
  res.send(response);
}

var searchBrandWithQuantitativeAttrNo = function(postParam, req, res) {
  console.log("searchBrandWithQuantitativeAttrNo");
  var attribute = JSON.parse(postParam).result.contexts[0].parameters.quantitativeAttr.toLowerCase();
  var brand = JSON.parse(postParam).result.contexts[0].parameters.brand.toLowerCase();
  if(brand == "3m") 
    brand = "filtrete";
  console.log("attribute :" + attribute + " brand: " + brand);

  filter.view('searchFilterDesign', 'searchBrandWithAttrView', { key: brand }, function(err, body) {  
    if(!err){
      var brandData = body.rows[0].value;
      var modelMedium = brandData.model_medium[attribute];
      var shelf = brandData.shelf;
      console.log("modelMedium: " + modelMedium);
      var response = {
                "speech": "In this store, " + modelMedium + " is a reasonably good air filter for " + attribute + " based on customer review and industry data. This model is located at " + shelf + ". Would you like to purchase this model?" ,
                "displayText": "Great, I can help you with that. Do you have any minimum criteria for " + brand + " air filter with " + attribute + "?" ,
                "source": "apiai-filter-search"
              };

      res.contentType('application/json');
      res.send(response);
    }
  });
}

var searchBrandWithNonQuantitativeAttr = function(postParam, req, res){
  console.log("searchBrandWithNonQuantitativeAttr"); 
  var brand = JSON.parse(postParam).result.parameters.brand.toLowerCase();
  var attribute = JSON.parse(postParam).result.parameters.nonQuantitativeAttr.toLowerCase();
  if(brand == "3m") 
    brand = "filtrete";
  console.log("attribute :" + attribute + " brand: " + brand);
  filter.view('searchFilterDesign', 'searchBrandWithAttrView', { key: brand }, function(err, body) {  
    if(!err){
      var brandData = body.rows[0].value; 
      var filterModels = [];
      for(i in brandData.filters) { 
        if(brandData.filters[i][attribute]) {
          filterModels[i] = brandData.filters[i].name;
        } 
      }
      console.log("Matching filters: " + filterModels.toString());
      var response = {
                "speech": "Great, I can help you with that. In this store, " + filterModels.toString() + " meet(s) your criteria for " + attribute + " based on customer review and industry data. This model is located at " + brandData.shelf + ". Do you know which one you would like to purchase?" ,
                "displayText": "Great, I can help you with that. In this store, " + filterModels.toString() + " meet(s) your criteria for " + attribute + " based on customer review and industry data. This model is located at " + brandData.shelf + ". Do you know which one you would like to purchase?" ,
                "source": "apiai-filter-search"
              };

      res.contentType('application/json');
      res.send(response);
    }
  });
}

var searchBrandWithCriteria = function(postParam, req, res) {
  console.log("%o", postParam);
  var brand;
  if(JSON.parse(postParam).result.parameters["brand"] != null)
    brand = JSON.parse(postParam).result.parameters.brand.toLowerCase();
  else
    brand = JSON.parse(postParam).result.contexts[0].parameters.brand;
  
  var attribute = JSON.parse(postParam).result.parameters.quantitativeAttr.toLowerCase();
  var num1 = JSON.parse(postParam).result.parameters.number[0];
  var num2 = JSON.parse(postParam).result.parameters.number[1];
  var criteria = JSON.parse(postParam).result.parameters.criteria;
  var isLessThan = false, isGreaterThan = false, isBetween = false;
  var response;

  if(lessThanCriteria.indexOf(criteria) >= 0)
    isLessThan = true;
  else if(greaterThanCriteria.indexOf(criteria) >= 0)
    isGreaterThan = true;
  else if(betweenCriteria.indexOf(criteria) >= 0) 
    isBetween = true;
  else {
    response = {
                "speech": "I'm sorry. There are no models in this store that match your criteria. Do you have any other criteria for " + brand + " air filters?" ,
                "displayText": "I'm sorry. We don't have any products that match your description. Can you describe it in another way?" ,
                "source": "apiai-filter-search"
          };
    res.contentType('application/json');
    res.send(response);
  }
  
  console.log("searchBrandWithCriteria" + "attribute :" + attribute + " brand: " + brand + " num1:" + num1 + " num2:" + num2 + " criteria:" + criteria);
  console.log("flags: " + isLessThan + isGreaterThan + isBetween);

  if(brand == "3m") 
    brand = "filtrete";

  filter.view('searchFilterDesign', 'searchBrandWithAttrView', { key: brand }, function(err, body) { 
    if(!err){
      var brandData = body.rows[0].value; 
      var filterModels = [];
      for(i in brandData.filters) { 
        console.log("attr value: " + brandData.filters[i][attribute]);
        if(isLessThan) {
          if(brandData.filters[i][attribute] <=  num1) {
            console.log("less than");
            filterModels.push(brandData.filters[i].name);
          } 
        }
        else if(isGreaterThan) {
          if(brandData.filters[i][attribute] >=  num1) {
            console.log("less than");
            filterModels.push(brandData.filters[i].name);
          } 
        }
        else if(isBetween) {
          if(brandData.filters[i][attribute] >= num1 && brandData.filters[i][attribute] <= num2) {
            filterModels.push(brandData.filters[i].name);
          } 
        }
      }
      if(filterModels.length == 0) {
        response = {
                "speech": "I'm sorry. There are no models in this store that match your criteria. Do you have any other criteria for " + brand " air filters?" ,
                "displayText": "I'm sorry. We don't have any products that match your description. Can you describe it in another way?" ,
                "source": "apiai-filter-search"
        };
      }
      else {
        response = {
                "speech": "Great, I can help you with that. In this store, " + filterModels.toString() + " meet(s) your criteria for " + attribute + " based on customer review and industry data. This model is located at " + brandData.shelf + ". Do you know which one you would like to purchase?" ,
                "displayText": "Great, I can help you with that. In this store, " + filterModels.toString() + " meet(s) your criteria for " + attribute + " based on customer review and industry data. This model is located at " + brandData.shelf + ". Do you know which one you would like to purchase?" ,
                "source": "apiai-filter-search"
        };
      }
      
      res.contentType('application/json');
      res.send(response);
    }
  });
  
}


/************************** MySQL Webhook **************************/

app.post('/webhookMySql', function (req, res) { 
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

        if(action == "searchBrandWithoutAttr") {
          searchBranchWithoutAttr_MySql(jsonString, req, res);
        }

        else if(action == "searchBrandWithoutAttrNo"){
          searchBrandWithoutAttrNo(jsonString, req, res);
        }

        else if(action == "searchBrandWithQuantitativeAttr"){
          searchBrandWithQuantitativeAttr(jsonString, req, res);
        }

        else if(action == "searchBrandWithQuantitativeAttrNo"){
          searchBrandWithQuantitativeAttrNo_MySql(jsonString, req, res);
        } 

        else if(action == "searchBrandWithNonQuantitativeAttr"){
          searchBrandWithNonQuantitativeAttr_MySql(jsonString, req, res);
        }
      });
    }
});

var searchBranchWithoutAttr_MySql = function(postParam, req, res) {
  console.log("searchBranchWithoutAttr");
  var brand = JSON.parse(postParam).result.parameters.brand;
  var response = "";
  console.log("brand :" + brand);
  
  //TODO change this to MySql
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
  // End

};

var searchBrandWithQuantitativeAttrNo_MySql = function(postParam, req, res) {
  console.log("searchBrandWithQuantitativeAttrNo");
  var attribute = JSON.parse(postParam).result.contexts[0].parameters.quantitativeAttr.toLowerCase();
  var brand = JSON.parse(postParam).result.contexts[0].parameters.brand.toLowerCase();
  if(brand == "3m") 
    brand = "filtrete";
  console.log("attribute :" + attribute + " brand: " + brand);

  // TODO change this to MySql
  filter.view('searchFilterDesign', 'searchBrandWithAttrView', { key: brand }, function(err, body) {  
    if(!err){
      var brandData = body.rows[0].value;
      var modelMedium = brandData.model_medium[attribute];
      var shelf = brandData.shelf;
      console.log("modelMedium: " + modelMedium);
      var response = {
                "speech": "In this store, " + modelMedium + " is a reasonably good air filter for " + attribute + " based on customer review and industry data. This model is located at " + shelf + ". Would you like to purchase this model?" ,
                "displayText": "Great, I can help you with that. Do you have any minimum criteria for " + brand + " air filter with " + attribute + "?" ,
                "source": "apiai-filter-search"
              };

      res.contentType('application/json');
      res.send(response);
    }
  });
  // End

}

var searchBrandWithNonQuantitativeAttr_MySql = function(postParam, req, res){
  console.log("searchBrandWithNonQuantitativeAttr"); 
  var brand = JSON.parse(postParam).result.parameters.brand.toLowerCase();
  var attribute = JSON.parse(postParam).result.parameters.nonQuantitativeAttr.toLowerCase();
  if(brand == "3m") 
    brand = "filtrete";
  console.log("attribute :" + attribute + " brand: " + brand);

  // TODO change this to MySql
  filter.view('searchFilterDesign', 'searchBrandWithAttrView', { key: brand }, function(err, body) {  
    if(!err){
      var brandData = body.rows[0].value; 
      var filterModels = [];
      for(i in brandData.filters) { 
        if(brandData.filters[i][attribute]) {
          filterModels[i] = brandData.filters[i].name;
        } 
      }
      console.log("Matching filters: " + filterModels.toString());
      var response = {
                "speech": "Great, I can help you with that. In this store, " + filterModels.toString() + " meet(s) your criteria for " + attribute + " based on customer review and industry data. This model is located at " + brandData.shelf + ". Do you know which one you would like to purchase?" ,
                "displayText": "Great, I can help you with that. In this store, " + filterModels.toString() + " meet(s) your criteria for " + attribute + " based on customer review and industry data. This model is located at " + brandData.shelf + ". Do you know which one you would like to purchase?" ,
                "source": "apiai-filter-search"
              };

      res.contentType('application/json');
      res.send(response);
    }
  });
  //END

}


var port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('Example app listening on port 3000!');
});