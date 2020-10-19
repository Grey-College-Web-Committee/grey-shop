// Get the exported classes from the sequelize module in node.js
const { Sequelize, Model, DataTypes } = require("sequelize");

// Create an instance of sequelise with the specific database from the .env file
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: process.env.DB_DIALECT
});

// Define the models representing tables in the database
// Note that sequelize will pluralise these for us
// User => users

class User extends Model {}
class GymMembership extends Model {}

// Sequelize will automatically add IDs, createdAt and updatedAt

// No need to store a users email it is simply username@durham.ac.uk
// Wouldn't be difficult to add if it is wanted in the future
User.init({
  username: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, { sequelize });

// Only need to store the length of membership can derive end date
// Considered putting this in the Users table but keeping it separate
// allows for greater expansion of any functionality (e.g. automating the approval process for their cards)
GymMembership.init({
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  option: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  approved: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, { sequelize });

// Associations are necessary to allow joins between tables

User.hasMany(GymMembership, { foreignKey: 'userId' });
GymMembership.belongsTo(User, { foreignKey: 'userId' });

module.exports = { User, GymMembership }
