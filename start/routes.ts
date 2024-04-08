
import router from '@adonisjs/core/services/router'

router.post('/generate-meals', '#controllers/meals_controller.generateMeals')
router.post('/getkalperday', '#controllers/meals_controller.getkalPerDay')
