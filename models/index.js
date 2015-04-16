"use strict";

var fs        = require("fs");
var path      = require("path");
var Sequelize = require("sequelize");
var basename  = path.basename(module.filename);
var env       = process.env.NODE_ENV || "development";
var config    = require(__dirname + '/../config/config.json')[env];

// NEEDED FOR HEROKU ///////////
if(config.use_env_variable){
  var db_info = process.env[config.use_env_variable].match(/([^:]+):\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  config.dialect=db_info[1];
  config.username=db_info[2];
  config.password=db_info[3];
  config.host=db_info[4];  
  config.port=db_info[5];  
  config.database=db_info[6];  
}
//////////////////////////////

var sequelize = new Sequelize(config.database, config.username, config.password, config);
var db        = {};


fs
  .readdirSync(__dirname)
  .filter(function(file) {
    return (file.indexOf(".") !== 0) && (file !== basename);
  })
  .forEach(function(file) {
    var model = sequelize["import"](path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach(function(modelName) {
  if ("associate" in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
