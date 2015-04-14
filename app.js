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
	res.render("index", {title: "My title"});
});


app.get('/login', function(req,res){
	req.currentUser().then(function(user){
		if (user) {
			res.redirect('/profile');
		} else {
			res.render("user/login");
		}
	});
});

app.get('/signup', function(req,res){
	res.render("user/signup");
});

app.get('/profile', function(req,res){
	req.currentUser().then(function(dbUser){
		if (dbUser) {
			db.FavoriteMovie.findAll({where: {UserId: dbUser.id}})
			  .then(function(movies){
			  	console.log("\n\n\n\n\nHELLO", movies);
				res.render('user/profile', {ejsUser: dbUser, idk: movies});
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
	  		res.redirect('/profile');
	  	} else {
	  		res.redirect('/login');
	  	}
	  }); 
});

// GET /user/:id ---> req.params.id
// GET /user -------> req.query.id
// POST /user ------> req.body.id

app.post('/signup', function(req,res){
	var email = req.body.email;
	var password = req.body.password;
	db.User.createSecure(email,password)
	  .then(function(user){
	  	res.redirect('/profile');
	  });
});

app.delete('/logout', function(req,res){
	req.logout();
	res.redirect('/login');
});


app.get('/search',function(req,res){
	var movieSearch = req.query.q3;
	if (!movieSearch) {
		res.render("search", {movies: [], noMovies: true});
	} else {
		var url = "http://www.omdbapi.com?s="+movieSearch;

		request(url, function(err, resp, body){
			console.log("I'm in here 2");
			if (!err && resp.statusCode === 200) {
				console.log("I'm in here 3");
				var jsonData = JSON.parse(body);
				if (!jsonData.Search) {
					res.render("search", {movies: [], noMovies: true});
				}
				res.render("search", {movies: jsonData.Search, noMovies: false});
			}
		});
	}
});

app.get('/movie', function(req,res){
	var imdbID = req.query.id;

	var url = 'http://www.omdbapi.com?i='+imdbID;
	request(url, function(err, resp, body){
		if (!err && resp.statusCode === 200) {
			var movieData = JSON.parse(body);
			res.render("movie", {movie: movieData});	
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
	console.log("I'm listening");
});