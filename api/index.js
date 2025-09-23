const App = require('../src/app');
const database = require('../src/config/database');

let app;
let isConnected = false;

module.exports = async (req, res) => {
  try {
    if (!app) {
      // Connect to database if not already connected
      if (!isConnected) {
        await database.connect();
        isConnected = true;
      }
      
      // Create app instance
      const appInstance = new App();
      app = appInstance.getApp();
    }
    
    return app(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};