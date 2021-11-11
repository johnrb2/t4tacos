const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const compression = require('compression')
const { getCurrentInvoke } = require('@vendia/serverless-express')
const axios = require('./axios')
const stream = require('stream')
const FormData = require('form-data')
const ejs = require('ejs').__express
const app = express()
const router = express.Router()

app.set('view engine', 'ejs')
app.engine('.ejs', ejs)

router.use(compression())

router.use(cors())
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: true }))

router.get('/', (req, res) => res.json('OK'))

router.get('/taco_recipes/:id/recipe_card', async (req, res, next) => {
  try {
    const recipe = getTacoRecipe(+req.params.id)
    // Generate form data
    const form = new FormData()
    form.append('title', recipe.name)
    form.append('ingredients', `${recipe.shell}\n${recipe.protein}\n${recipe.toppings}\n${recipe.sauces}`.replace(/\n\n/g, '\n'))
    form.append('instructions', recipe.instructions)
    form.append('readyInMinutes', 30)
    form.append('servings', 6)
    form.append('mask', 'ellipseMask')
    form.append('backgroundImage', 'background1')
    form.append('imageUrl', 'https://live.staticflickr.com/3931/15253183310_1f044198e4_b.jpg')
    form.append('author', 'Anna Banana')
    form.append('backgroundColor', '#ffffff')
    form.append('fontColor', '#333333')
    form.append('source', 'live.staticflickr.com')

    // be sure to use form.getHeaders or the boundaries won't be properly set
    const { data } = await axios.post('/recipes/visualizeRecipe', form, { headers: form.getHeaders() })
    const { data: r } = await axios.get(data.url, { responseType: 'stream' })
    const ps = new stream.PassThrough() // for stream error handling
    stream.pipeline(
      r,
      ps, // for stream error handling
      (err) => {
        if (err) {
          throw err
        }
      })
    ps.pipe(res)
  } catch (e) {
    next(e)
  }
})

router.get('/taco_recipes', (req, res, next) => {
  try {
    const tacoRecipeArr = []
    tacoRecipes.forEach((value, key, map) => tacoRecipeArr.push(value))
    res.json(tacoRecipeArr)
  } catch (e) {
    next(e)
  }
})

router.get('/sauces', async (req, res, next) => {
  try {
    const { data } = await axios.get('/food/ingredients/search', {
      params: {
        query: 'sauce',
        number: 100
      }
    })
    const sauces = data.results.map(result => result.name)
    res.json(sauces)
  } catch (e) {
    next(e)
  }
})

router.post('/taco_recipes/', (req, res, next) => {
  try {
    if (!req.body.name) {
      res.status(409).json({
        code: 409,
        message: 'Conflict',
        reason: 'Taco Recipe Name missing from request body.'
      })
    }
    const recipe = {
      id: ++userIdCounter,
      name: req.body.name,
      description: req.body.description || '',
      instructions: req.body.instructions,
      shell: req.body.shell,
      protein: req.body.protein,
      toppings: req.body.toppings,
      sauces: req.body.sauces
    }
    tacoRecipes.set(recipe.id, recipe)
    res.status(201).json(recipe)
  } catch (e) {
    next(e)
  }
})

router.put('/taco_recipes/:id', (req, res, next) => {
  try {
    let recipe = getTacoRecipe(+req.params.id)

    if (!recipe) return res.status(404).json({})

    tacoRecipes.set(+req.params.id, Object.assign(recipe, req.body))
    recipe = getTacoRecipe(+req.params.id)
    res.json(recipe)
  } catch (e) {
    next(e)
  }
})

router.delete('/taco_recipes/:id', (req, res, next) => {
  try {
    tacoRecipes.delete(+req.params.id)
    res.send(204)
  } catch (e) {
    next(e)
  }
})

const getTacoRecipe = id => tacoRecipes.get(id)

// Ephemeral in-memory data store
const tacoRecipes = new Map()
tacoRecipes.set(1, {
  id: 1,
  name: 'Basic Crunchy Taco',
  description: 'Basic Ground Beef Taco with a crunchy shell',
  instructions: 'Brown 1 lb ground beef\nDrain fat\nAdd water and seasoning\nSimmer for 3 minutes stir periodically\nPlace meat in crunchy corn shell\nAdd toppings\nEnjoy',
  shell: 'Crunchy Corn Tortilla Shell',
  protein: 'Ground Beef',
  toppings: 'Lettuce and Cheese',
  sauces: 'No Sauce'
})
tacoRecipes.set(2, {
  id: 2,
  name: 'Basic Soft Taco',
  description: 'Basic Ground Beef Taco with a crunchy shell',
  instructions: 'Brown 1 lb ground beef\nDrain fat\nAdd water and seasoning\nSimmer for 3 minutes stir periodically\nPlace meat in crunchy corn shell\nAdd toppings\nEnjoy',
  shell: 'Small Soft Flour Tortilla',
  protein: 'Ground Beef',
  toppings: 'Lettuce and Cheese',
  sauces: 'No Sauce'
})

let userIdCounter = tacoRecipes.size

// The serverless-express library creates a server and listens on a Unix
// Domain Socket for you, so you can remove the usual call to app.listen.
// app.listen(3000)
app.use('/', router)

// Export your express server so you can import it in the lambda function.
module.exports = app
