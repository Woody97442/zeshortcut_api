
import Product from "#models/product"
import { HttpContext } from "@adonisjs/core/http"

export default class MealsController {

  async generateMeals({ response }: HttpContext) {
    const labelsTypeMealsForDay = ["Petit-déjeuner", "Dejeuner", "Collation", "Diner"];
    const kcalPerDay: number = 2316;
    const kcalPerMeal: number = kcalPerDay / 4;

    const mealPromises: Promise<any>[] = [];

    for (let index = 0; index < labelsTypeMealsForDay.length; index++) {
      mealPromises.push(generateMeals(kcalPerMeal, labelsTypeMealsForDay[index]));
    }

    const generatedMeals = await Promise.all(mealPromises);

    const mealsGenerated = generatedMeals.reduce((acc, meal, index) => {
      acc[labelsTypeMealsForDay[index]] = meal;
      return acc;
    }, {});

    return response.ok(mealsGenerated);
  }
}

async function generateMeals(kcalPerMeal: number, mealsLabel: string) {

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
    entrée: `${choisedProductLipids.product.label} ${choisedProductLipids.product.portion * choisedProductLipids.multiplier}${choisedProductLipids.product.label_portion}`,
    plat: `${choisedProductProteins.product.label} ${choisedProductProteins.product.portion * choisedProductProteins.multiplier}${choisedProductProteins.product.label_portion}`,
    dessert: `${choisedProductCarbohydrates.product.label} ${choisedProductCarbohydrates.product.portion * choisedProductCarbohydrates.multiplier}${choisedProductCarbohydrates.product.label_portion}`
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
