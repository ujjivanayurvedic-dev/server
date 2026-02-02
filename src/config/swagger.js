const swaggerJsdoc = require("swagger-jsdoc");

module.exports = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Auth API",
      version: "1.0.0",
      description: "API for user authentication",
    },
    servers: [
      {
        url: "https://king-api-emi1.onrender.com",
        description: "Local server",
      },
    ],
  },
  apis: ["./src/routes/*.js"], 
});
