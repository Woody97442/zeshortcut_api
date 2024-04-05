import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Product extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare label: string

  @column()
  declare protein: number

  @column()
  declare lipid: number

  @column()
  declare carbohydrate: number

  @column()
  declare type_category: string

}
