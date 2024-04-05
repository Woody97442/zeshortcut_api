import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Product extends BaseModel {
  [x: string]: any
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

  @column()
  declare portion: number

  @column()
  declare label_portion: string

  @column()
  declare type_product: string

  @column()
  declare composing: string[]

}
