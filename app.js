var express = require('express');
var app = express();
var request = require('request');
var db = require('./models');
var bodyParser = require('body-parser');
var session = require('express-session');
var methodOverride = require('method-override');

app.set("view engine", "ejs");	
// This defines req.session
app.use(session({
	secret: "I'm very very secret thing",
	resave: false,
	save: {
		uninitialize: true
	}
}));

app.use("/", function(req,res,next) {
	req.login = function(user) {
		req.session.userId = user.id;
	};
	req.currentUser = function() {
		return db.User.find(req.session.userId)
		         .then(function(dbUser) {
		         	req.user = dbUser;
		         	return dbUser;
		         });
	};
	req.logout = function() {
		req.session.userId = null;
		req.user = null;
	};
	next();
});

app.use(methodOverride("_method"));

app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static('public'));

app.get('/', function(req,res){
	res.render("index", {title: "what's in your frydge?"});
});


app.get('/login', function(req,res){
	req.currentUser().then(function(user){
		if (user) {
			res.redirect('/box');
		} else {
			res.render("user/login");
		}
	});
});

app.get('/register', function(req,res){
	res.render("user/register");
});

app.get('/box', function(req,res){
	req.currentUser().then(function(dbUser){
		if (dbUser) {
			db.FavoriteRecipe.findAll({where: {UserId: dbUser.id}})
			  .then(function(recipes){
			  	console.log("\n\n\n\n\nHELLO", recipes);
				res.render('user/box', {ejsUser: dbUser, yum: recipes});
			});
		} else {
			res.redirect('/login');
		}
	});
});

app.post('/login', function(req,res){
	var email = req.body.email;
	var password = req.body.password;
	db.User.authenticate(email,password)
	  .then(function(dbUser){
	  	if(dbUser) {
	  		req.login(dbUser);
	  		res.redirect('/box');
	  	} else {
	  		res.redirect('/login');
	  	}
	  }); 
});

// GET /user/:id ---> req.params.id
// GET /user -------> req.query.id
// POST /user ------> req.body.id

app.post('/register', function(req,res){
	var email = req.body.email;
	var password = req.body.password;
	db.User.createSecure(email,password)
	  .then(function(user){
	  	res.redirect('/box');
	  });
});

app.delete('/logout', function(req,res){
	req.logout();
	res.redirect('/login');
});


app.get('/search',function(req,res){
	var recipeSearch = req.query.lmk;
	if (!recipeSearch) {
		res.render("search", {recipes: [], noRecipes: true});
	} else {
		var url = "http://api.yummly.com/v1/api/recipes?_app_id=3e775ebe&_app_key=e7c79fa0efc5e9338bf35e68bd761b42&q="+recipeSearch+"&allowedDiet[]=389^Ovo vegetarian&allowedAllergy[]=393^Gluten-Free&allowedAllergy[]=398^Seafood-Free&allowedAllergy[]=400^Soy-Free&allowedAllergy[]=392^Wheat-Free&maxTotalTimeInSeconds=1800";

		request(url, function(err, resp, body){
			if (!err && resp.statusCode === 200) {
				var jsonData = JSON.parse(body);
				if (!jsonData.Search) {
					res.render("search", {recipes: [], noRecipes: true});
				}
				res.render("search", {recipes: jsonData.Search, noRecipes: false});
			}
		});
	}
});

app.get('/recipe', function(req,res){
	var yumID = req.query.id;

	var url = 'http://www.yummly.com/recipe/'+yumID;
	request(url, function(err, resp, body){
		if (!err && resp.statusCode === 200) {
			var recipeData = JSON.parse(body);
			res.render("recipe", {recipe: recipeData});	
		}
	});
});

app.post('/favorites', function(req,res){
	var imdbID = req.body.imdbID;
	var rating = req.body.rating;

	req.currentUser().then(function(dbUser){
		if (dbUser) {
			dbUser.addToFavs(db,imdbID,rating).then(function(movie){
				res.redirect('/profile');
			});
		} else {
			res.redirect('/login');
		}
	});
});


app.listen(3000, function(){
	console.log("Wassup?");
});