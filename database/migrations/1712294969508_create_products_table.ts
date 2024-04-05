import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'products'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('label').notNullable()
      table.float('protein').nullable()
      table.float('lipid').nullable()
      table.float('carbohydrate').nullable()
      table.string('type_category').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
