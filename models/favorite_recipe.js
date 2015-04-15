"use strict";
module.exports = function(sequelize, DataTypes) {
  
  var FavoriteRecipe = sequelize.define("FavoriteRecipe", {
    yummly_id: DataTypes.STRING,
    recipe_name: DataTypes.STRING,
    UserId: DataTypes.INTEGER
  }, {
    classMethods: {
      associate: function(models) {
        this.belongsTo(models.User);
      }
    }
  });
  return FavoriteRecipe;
};