"use strict";
module.exports = function(sequelize, DataTypes) {
  var Recipe = sequelize.define("Recipe", {
    yummly_id: DataTypes.STRING,
    recipe_name: DataTypes.STRING,
    user_id: DataTypes.INTEGER”
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return Recipe;
};