
import Product from "#models/product"
import { HttpContext } from "@adonisjs/core/http"
import nodemailer from 'nodemailer';

export default class MealsController {

  async getkalPerDay({ request, response }: HttpContext) {

    try {
      const sex: number = parseInt(request.input("sex"));
      const age: number = parseInt(request.input("age"));
      const weight: number = parseInt(request.input("weight"));
      const size: number = parseInt(request.input("size"));

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

    let BMR: number = parseInt(request.input("BMR"));
    const typePlan: number = parseInt(request.input("typePlan")); // add = 0 / remove = 1
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

    sendMail(userMail, formatMealsForHtml(mealsGenerated, userMail, BMR))

    return response.ok("ok");
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

function formatMealsForHtml(meals: any, userMail: string, BMR: number) {

  var htmlMeals: string = ""

  htmlMeals += `<p style = "text-align: center;" > <img src="cid:logo" alt="logo ZeShortCut"> </p>`
  htmlMeals += `<p style = "text-align: center;" > Bonjour ${userMail}, </p>`
  htmlMeals += `<p style = "text-align: center;" > Merci d'avoir choisie notre platforme</p>`
  htmlMeals += `<p style = "text-align: center;" > Votre nombre de kcal par jour est de: ${BMR} Kcal/j </p>`
  htmlMeals += `<p style = "text-align: center;" > Voici votre Plan de régime alimentaire personnalisé : </p><br/>`


  for (let index = 0; index < Object.keys(meals).length; index++) {
    var htmlMeal: string = "";
    const meal: any = Object.values(meals)[index];
    htmlMeal += `<h3 style = "text-align: center;">${meal.label}</h3>`
    htmlMeal += `<p style = "text-align: center;">${meal.Appetizer.label} : ${meal.Appetizer.portion} ${meal.Appetizer.unit}</p>`
    htmlMeal += `<p style = "text-align: center;">${meal.main_course.label} : ${meal.main_course.portion} ${meal.main_course.unit}</p>`
    htmlMeal += `<p style = "text-align: center;">${meal.dessert.label} : ${meal.dessert.portion} ${meal.dessert.unit}</p>`

    htmlMeals += htmlMeal;
  }

  return htmlMeals;
}


function sendMail(userMail: string, html: string) {

  // Créer un transporteur SMTP réutilisable
  let transporter = nodemailer.createTransport({
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'zeshortcut.974@outlook.fr',
      pass: 'CDA97419'
    },
    tls: {
      ciphers: 'SSLv3'
    }
  });

  // Paramètres de l'e-mail
  let mailOptions = {
    from: 'zeshortcut.974@outlook.fr',
    to: userMail,
    subject: 'Votre Plan personnalisé et prêt',
    html: html,
    attachments: [{
      filename: 'logo.png',
      path: 'public/images/logo.png',
      cid: 'logo' // id de l'image dans le contenu HTML de l'e-mail
    }]
  };

  // Envoyer l'e-mail
  transporter.sendMail(mailOptions, function (error: any, info: { response: string; }) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email envoyé: ' + info.response);
    }
  });
}
