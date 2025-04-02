/**
 * Migration script to create the new product-related tables
 */
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create transactions for atomic operations
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Create Product table
      await queryInterface.createTable('produk', {
        id_produk: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        kode_item: {
          type: DataTypes.STRING(20),
          unique: true,
          allowNull: false
        },
        nama_item: {
          type: DataTypes.STRING(100),
          allowNull: false
        },
        jenis: {
          type: DataTypes.STRING(50),
          allowNull: true
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      // 2. Create Product Variant table
      await queryInterface.createTable('produk_varian', {
        id_varian: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        id_produk: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'produk',
            key: 'id_produk'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        deskripsi: {
          type: DataTypes.STRING(100),
          allowNull: false
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      // 3. Create Product Unit table
      await queryInterface.createTable('produk_satuan', {
        id_satuan: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        id_produk: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'produk',
            key: 'id_produk'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        nama_satuan: {
          type: DataTypes.STRING(20),
          allowNull: false
        },
        jumlah_dalam_satuan_dasar: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 1.00
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      // 4. Create Product Price table
      await queryInterface.createTable('produk_harga', {
        id_harga: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        id_produk: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'produk',
            key: 'id_produk'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        id_satuan: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'produk_satuan',
            key: 'id_satuan'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        minimal_qty: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1
        },
        maksimal_qty: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        harga_pokok: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00
        },
        harga_jual: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      // 5. Create Product Stock table
      await queryInterface.createTable('produk_stok', {
        id_stok: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        id_produk: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'produk',
            key: 'id_produk'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        id_satuan: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'produk_satuan',
            key: 'id_satuan'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        jumlah_stok: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      // Add indexes for better performance
      await queryInterface.addIndex('produk', ['kode_item'], { 
        unique: true,
        transaction 
      });
      
      await queryInterface.addIndex('produk_varian', ['id_produk'], { 
        transaction 
      });
      
      await queryInterface.addIndex('produk_satuan', ['id_produk'], { 
        transaction 
      });
      
      await queryInterface.addIndex('produk_harga', ['id_produk', 'id_satuan'], { 
        transaction 
      });
      
      await queryInterface.addIndex('produk_stok', ['id_produk', 'id_satuan'], { 
        transaction 
      });

      await transaction.commit();
      console.log('Migration: Successfully created product tables');
    } catch (error) {
      await transaction.rollback();
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Drop tables in reverse order to handle foreign key constraints
      await queryInterface.dropTable('produk_stok', { transaction });
      await queryInterface.dropTable('produk_harga', { transaction });
      await queryInterface.dropTable('produk_satuan', { transaction });
      await queryInterface.dropTable('produk_varian', { transaction });
      await queryInterface.dropTable('produk', { transaction });
      
      await transaction.commit();
      console.log('Rollback: Successfully dropped product tables');
    } catch (error) {
      await transaction.rollback();
      console.error('Rollback failed:', error);
      throw error;
    }
  }
};
