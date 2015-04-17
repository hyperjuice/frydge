var express = require('express');
var app = express();
var request = require('request');
var db = require('./models');
var bodyParser = require('body-parser');
var session = require('express-session');
var methodOverride = require('method-override');
var env = process.env;

app.set("view engine", "ejs");	

app.use(session({
	secret: env.MY_SESSION_SECRET,
	resave: false,
	saveUninitialized: true,
}));

app.use("/", function(req, res, next) {
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

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));

app.get('/', function(req, res) {
	res.render("index", { h1: "frydge.com", h3: "what's in your frydge?" });
});

app.get('/login', function(req, res) {
	req.currentUser().then(function(user) {
		
		if (user) {
			res.redirect('/box');
		} else {
			res.render("user/login");
		}
	});
});

app.get('/register', function(req, res) {
	res.render("user/register");
});

app.get('/box', function(req, res) {
	req.currentUser().then(function(user) {

		if (user) {
			user.getFavoriteRecipes().then(function(recipes) {
				res.render('user/box', { user: user, recipes: recipes });
			});
		} else {
			res.redirect('/login');
		}
	});
});

app.post('/login', function(req, res) {
	var email = req.body.email;
	var password = req.body.password;
	db.User.authenticate(email,password).then(function(dbUser) {
		
		if(dbUser) {
			req.login(dbUser);
			res.redirect('/box');
		} else {
			res.redirect('/login');
		}
	}); 
});

app.post('/register', function(req, res) {
	var email = req.body.email;
	var password = req.body.password;
	db.User.createSecure(email, password).then(function(user) {
		res.redirect('/box');
	});
});

app.delete('/logout', function(req, res) {
	req.logout();
	res.redirect('/login');
});

app.get('/search',function(req, res) {
	var q = req.query.q;

	if (!q) {
		res.render("search", { recipes: [], noRecipes: true });
	} else {
		var url = "http://api.yummly.com/v1/api/recipes?_app_id=3e775ebe&_app_key=" + env.MY_API_KEY + "&q=" + q + "&allowedDiet[]=389^Ovo vegetarian&allowedAllergy[]=393^Gluten-Free&allowedAllergy[]=398^Seafood-Free&allowedAllergy[]=400^Soy-Free&allowedAllergy[]=392^Wheat-Free&allowedAllergy[]=396^Dairy-Free&maxTotalTimeInSeconds=1800";

		request(url, function(err, resp, body) {

			if (!err && resp.statusCode === 200) {
				var results = JSON.parse(body);
				if (!results.matches.length) {
					res.render("search", { recipes: [], noRecipes: true });
				}
				res.render("search", { recipes: results.matches, noRecipes: false });
			} else {
				res.send('Something went wrong with Yummly.');
			}
		});
	}
});

app.get('/recipes/:yummlyId', function(req, res) {
	var yumID = req.params.yummlyId;
	var url = 'http://api.yummly.com/v1/api/recipe/' + yumID + '?_app_id=3e775ebe&_app_key=' + env.MY_API_KEY;
	request(url, function(err, resp, body){
		if (!err && resp.statusCode === 200) {
			var recipe = JSON.parse(body);
			res.render("recipe", { recipe: recipe });
		}
	});
});

//profile page
app.post('/box', function(req, res) {
	var yumID = req.body.yumID;
	var recipeName = req.body.recipeName;
	db.FavoriteRecipe.create({yummly_id: yumID, recipe_name: recipeName, UserId: req.session.userId})
		.then(function() {
			res.redirect("/box");
		});
});

app.delete('/favorites/:id', function(req, res) {
	// Check that user is logged in
	if (req.session.userId) {
		// Destroy favorite with that id, making sure it actually belongs to current user
		db.FavoriteRecipe.destroy({ where: { id: req.params.id, UserId: req.session.userId } }).then(function() {
			res.redirect('/box');
		});
	} else {
		res.redirect('/login');
	}
});

app.listen(process.env.PORT || 3000, function() {
	console.log("Wassup?");
});
