const axios = require('axios')
axios.defaults.baseURL = 'https://api.spoonacular.com'
axios.defaults.params = { apiKey: process.env.API_KEY }

module.exports = axios
