const path = require('path');

module.exports = {
  entry: './script.js',  // Path to your main JavaScript file
  output: {
    filename: 'bundle.js',  // Output file name
    path: path.resolve(__dirname, '.')  // Output directory path
  }
};

