/**
 * Migration to create product-related tables
 */
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create the main product table
    await queryInterface.createTable('produk', {
      id_produk: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      kode_item: {
        type: DataTypes.STRING(100),
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
      supplier_code: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      supplier_name: {
        type: DataTypes.STRING(100),
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
    });
    
    // Create the product variant table
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
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
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
    });
    
    // Create the product unit table
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
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
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
    });
    
    // Create the product price table
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
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      id_satuan: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'produk_satuan',
          key: 'id_satuan'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
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
    });
    
    // Create the product stock table
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
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      id_satuan: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'produk_satuan',
          key: 'id_satuan'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
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
    });
    
    console.log('Created product tables');
    return Promise.resolve();
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('produk_stok');
    await queryInterface.dropTable('produk_harga');
    await queryInterface.dropTable('produk_satuan');
    await queryInterface.dropTable('produk_varian');
    await queryInterface.dropTable('produk');
    
    console.log('Dropped product tables');
    return Promise.resolve();
  }
};
