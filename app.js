var express = require('express');
var app = express();
var request = require('request');
var db = require('./models');
var bodyParser = require('body-parser');
var session = require('express-session');
var methodOverride = require('method-override');
var env = process.env;

app.set("view engine", "ejs");	

// Secure the session secret
app.use(session({
	secret: env.MY_SESSION_SECRET,
	resave: false,
	saveUninitialized: true,
}));

// Deal with authentication
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

// Enable use of HTTP verbs other than POST and GET
app.use(methodOverride("_method"));

app.use(bodyParser.urlencoded({ extended: true }));

// Allow access to files stored in the public folder
app.use(express.static('public'));

// Render the homepage for the app. See index.ejs
app.get('/', function(req, res) {
	res.render("index", { h1: "frydge: what's in it?" });
});

// Render the login page when the request is sent to the server for 'login'. See login.ejs
app.get('/login', function(req, res) {
	req.currentUser().then(function(user) {
		
		// If a user is already logged in (user), redirect user to the box (profile) page.
		// If not, render the login page. This makes use of the code in lines 19-35 above
		// Note that this is 'res' and not 'req'.
		if (user) {
			res.redirect('/box');
		} else {
			res.render("user/login");
		}
	});
});

// Render the register page. See register.ejs
app.get('/register', function(req, res) {
	res.render("user/register");
});

// Render the box (profile) page. See box.ejs
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

// Authenticate user
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

// Create a new user
app.post('/register', function(req, res) {
	var email = req.body.email;
	var password = req.body.password;
	db.User.createSecure(email, password).then(function(user) {
		res.redirect('/box');
	});
});

// Allow user to log out
app.delete('/logout', function(req, res) {
	req.logout();
	res.redirect('/login');
});

// Render the search page. See search.ejs. The Yummly API is called here.
// If there is an error on Yummly's side, this route handles that too.
// Recipe response restrictions are defined here.
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

// Render an individual recipe page. See recipe.ejs. The Yummly API is called here.
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

//Enable additions to the box (profile) page
app.post('/box', function(req, res) {
	var yumID = req.body.yumID;
	var recipeName = req.body.recipeName;
	db.FavoriteRecipe.create({yummly_id: yumID, recipe_name: recipeName, UserId: req.session.userId})
		.then(function() {
			res.redirect("/box");
		});
});

// Enable user to delete recipes from the box (profile) page
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

// Allow Heroku to function, or localhost
app.listen(process.env.PORT || 3000, function() {
	console.log("Wassup?");
});
