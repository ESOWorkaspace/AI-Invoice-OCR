require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Setup Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT || 'postgres',
    port: process.env.DB_PORT || 5432,
    logging: console.log
  }
);

// Define Product model
const ProductItem = sequelize.define('ProductItem', {
  id_produk: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_produk'
  },
  kode_item: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'kode_item'
  },
  nama_item: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'nama_item'
  },
  jenis: {
    type: DataTypes.STRING,
    field: 'jenis'
  },
  supplier_code: {
    type: DataTypes.STRING,
    field: 'supplier_code'
  },
  supplier_name: {
    type: DataTypes.STRING,
    field: 'supplier_name'
  }
}, {
  tableName: 'produk',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Function to seed products
async function seedProduct() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Check if table exists, create if it doesn't
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS produk (
          id_produk SERIAL PRIMARY KEY,
          kode_item VARCHAR(255) NOT NULL,
          nama_item VARCHAR(255) NOT NULL,
          jenis VARCHAR(255),
          supplier_code VARCHAR(255),
          supplier_name VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Table checked/created successfully');
    } catch (error) {
      console.error('Error creating table:', error);
      return;
    }

    // Add test products
    const testProducts = [
      {
        kode_item: 'TST001',
        nama_item: 'Test Product 1',
        jenis: 'Test',
        supplier_code: '12578170',
        supplier_name: 'Test Supplier'
      },
      {
        kode_item: 'TST002',
        nama_item: 'Susu Kental Manis',
        jenis: 'Susu',
        supplier_code: 'SKM123',
        supplier_name: 'PT ABC'
      },
      {
        kode_item: 'TST003',
        nama_item: 'Gula Pasir 1kg',
        jenis: 'Gula',
        supplier_code: 'GP456',
        supplier_name: 'PT XYZ'
      }
    ];

    for (const product of testProducts) {
      // Check if product already exists
      const existingProduct = await ProductItem.findOne({
        where: { kode_item: product.kode_item }
      });

      if (existingProduct) {
        console.log(`Product ${product.kode_item} already exists, updating...`);
        await existingProduct.update(product);
      } else {
        console.log(`Creating new product ${product.kode_item}...`);
        await ProductItem.create(product);
      }
    }

    console.log('Products seeded successfully');
  } catch (error) {
    console.error('Error seeding products:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the seed function
seedProduct()
  .then(() => {
    console.log('Seeding completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during seeding:', error);
    process.exit(1);
  }); 