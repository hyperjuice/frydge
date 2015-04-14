

"use strict";
module.exports = {
  up: function(migration, DataTypes, done) {
    migration.createTable("FavoriteRecipes", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      yummly_id: {
        type: DataTypes.STRING
      },
      recipe_name: {
        type: DataTypes.STRING
      },
      user_id: {
        type: DataTypes.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
      }
    }).done(done);
  },
  down: function(migration, DataTypes, done) {
    migration.dropTable("FavoriteRecipes").done(done);
  }
};