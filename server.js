const express = require('express');
const morgan = require('morgan');
const http = require('http');
const fileSystem = require('fs');

const app = express();

// Enable tracing if environment variable ENABLE_TRACING is set to 'true'
if (process.env.ENABLE_TRACING === 'true') {
  require('./tracing.js');
  console.log('XRay instrumentation enabled');
}

// Configure Morgan to log access logs to stdout
app.use(morgan('combined', {
  stream: process.stdout // Log to stdout
}));

// Handle root route
app.get('/', (req, res) => {
  fileSystem.readFile('./index.html', 'utf8', (error, fileContent) => {
    if (error) {
      res.status(500).send('Error');
    } else {
      const updatedContent = fileContent.replace('{{CLUSTER_NAME}}', process.env.CLUSTER_NAME || '');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(updatedContent);
    }
  });
});

// Create an HTTP server using the Express app
const server = http.createServer(app);

// Start the server
server.listen(8080, () => {
  console.log('Server running at http://localhost:8080');
});

module.exports = server;
