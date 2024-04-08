
import Product from "#models/product"
import { HttpContext } from "@adonisjs/core/http"

export default class MealsController {

  async getkalPerDay({ request, response }: HttpContext) {

    try {
      const sex: number = request.input("sex");
      const age: number = request.input("age");
      const weight: number = request.input("weight");
      const size: number = request.input("size");

      if (sex === undefined || !age || !weight || !size) {
        return response.badRequest({ message: "Missing parameters" });
      }

      var BMR: number = 0;

      if (sex === 0) {
        BMR = (88.362 + (13.397 * weight) + (4.799 * size) - (5.677 * age)) * 1.2; // Homme
      } else if (sex === 1) {
        BMR = (447.593 + (9.247 * weight) + (3.098 * size) - (4.330 * age)) * 1.2; // Femme
      }

      return response.ok({ YourBMR: Math.round(BMR) });
    } catch (error) {
      return response.badRequest({ message: "Missing parameters" });
    }


  }
  async generateMeals({ request, response }: HttpContext) {

    let BMR: number = request.input("BMR");
    const typePlan: number = request.input("typePlan"); // add = 0 / remove = 1
    const userMail: string = request.input("userMail");

    typePlan === 0 ? BMR = BMR + 250 : BMR = BMR - 250;


    const labelsTypeMealsForDay = ["Petit-déjeuner", "Dejeuner", "Collation", "Diner"];

    const kcalPerMeal: number = BMR / 4;

    const mealPromises: Promise<any>[] = [];

    for (let index = 0; index < labelsTypeMealsForDay.length; index++) {
      mealPromises.push(generateMealsPerDays(kcalPerMeal, labelsTypeMealsForDay[index]));
    }

    const generatedMeals = await Promise.all(mealPromises);

    const mealsGenerated = generatedMeals.reduce((acc, meal, index) => {
      acc[index.toString()] = meal;
      return acc;
    }, {});

    var data = {
      service_id: 'service_4m131ed',
      template_id: 'template_2x14ysm',
      user_id: 'pZV0QI4FINKtyyVSS',
      template_params: {
        'to_mail': userMail,
        'to_bmr': BMR,
        'message': mealsGenerated
      }
    };

    return response.ok(data);
  }
}

async function generateMealsPerDays(kcalPerMeal: number, mealsLabel: string) {

  const [productsProteins, productsLipids, productsCarbohydrates] = await Promise.all([
    Product.query().where("type_category", "protein"),
    Product.query().where("type_category", "lipid"),
    Product.query().where("type_category", "carbohydrate")
  ]);

  const gramPerMealForProteins: number = (kcalPerMeal * 0.2) / 4; // "protein": "28.95g"
  const gramPerMealForLipids: number = (kcalPerMeal * 0.3) / 9;    // "lipid": "19.30g"
  const gramPerMealForCarbohydrates: number = (kcalPerMeal * 0.5) / 4; // "carbohydrate": "72.38g"

  const choisedProductProteins: ProductWithMultiplier = selectProduct(productsProteins, gramPerMealForProteins, "protein");
  const choisedProductLipids: ProductWithMultiplier = selectProduct(productsLipids, gramPerMealForLipids, "lipid");
  const choisedProductCarbohydrates: ProductWithMultiplier = selectProduct(productsCarbohydrates, gramPerMealForCarbohydrates, "carbohydrate");

  const mealsGenerated = {
    label: mealsLabel,
    Appetizer: {
      label: choisedProductLipids.product.label,
      portion: choisedProductLipids.product.portion * choisedProductLipids.multiplier,
      unit: choisedProductLipids.product.label_portion,
    },
    main_course: {
      label: choisedProductProteins.product.label,
      portion: choisedProductProteins.product.portion * choisedProductProteins.multiplier,
      unit: choisedProductProteins.product.label_portion,
    },
    dessert: {
      label: choisedProductCarbohydrates.product.label,
      portion: choisedProductCarbohydrates.product.portion * choisedProductCarbohydrates.multiplier,
      unit: choisedProductCarbohydrates.product.label_portion
    }
  };

  return mealsGenerated;
}

interface ProductWithMultiplier {
  product: Product;
  multiplier: number;
}

function selectProduct(productList: Product[], gramNutrient: number, typeCategory: string) {

  let chosenProducts: ProductWithMultiplier[] = [];

  const errorMargin: number = 10;

  const nutrientKey = typeCategory as keyof Product;

  productList.forEach((product: Product) => {
    const nutrient = product[nutrientKey];

    for (let multiplier = 1; (nutrient * multiplier) < gramNutrient; multiplier++) {
      const nutrientForProduct = nutrient * multiplier;
      const diff: number = Math.abs(nutrientForProduct - gramNutrient);

      if (diff <= errorMargin) {
        chosenProducts.push({ product: product, multiplier });
      }
    }
  });

  const randomIndex: number = Math.floor(Math.random() * chosenProducts.length);
  const randomProduct: ProductWithMultiplier = chosenProducts[randomIndex];
  return randomProduct;
}
