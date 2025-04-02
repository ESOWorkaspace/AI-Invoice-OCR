/**
 * Seed file to create sample product data
 */
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add sample products
    await queryInterface.bulkInsert('produk', [
      {
        kode_item: 'P001',
        nama_item: 'Indomie Goreng',
        jenis: 'Mie Instan',
        supplier_code: 'SUP001',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        kode_item: 'P002',
        nama_item: 'Beras Pandan Wangi',
        jenis: 'Beras',
        supplier_code: 'SUP002',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        kode_item: 'P003',
        nama_item: 'Minyak Goreng Bimoli',
        jenis: 'Minyak',
        supplier_code: 'SUP003',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});

    // Get the inserted product IDs
    const products = await queryInterface.sequelize.query(
      `SELECT id_produk, kode_item FROM produk WHERE kode_item IN ('P001', 'P002', 'P003')`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Map product codes to IDs
    const productMap = {};
    products.forEach(product => {
      productMap[product.kode_item] = product.id_produk;
    });

    // Add variants for Indomie
    await queryInterface.bulkInsert('produk_varian', [
      {
        id_produk: productMap['P001'],
        deskripsi: 'Original',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id_produk: productMap['P001'],
        deskripsi: 'Pedas',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});

    // Add units for all products
    const units = [
      // Indomie units
      {
        id_produk: productMap['P001'],
        nama_satuan: 'pcs',
        jumlah_dalam_satuan_dasar: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id_produk: productMap['P001'],
        nama_satuan: 'dus',
        jumlah_dalam_satuan_dasar: 40,
        created_at: new Date(),
        updated_at: new Date()
      },
      // Beras units
      {
        id_produk: productMap['P002'],
        nama_satuan: 'kg',
        jumlah_dalam_satuan_dasar: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id_produk: productMap['P002'],
        nama_satuan: 'karung',
        jumlah_dalam_satuan_dasar: 25,
        created_at: new Date(),
        updated_at: new Date()
      },
      // Minyak units
      {
        id_produk: productMap['P003'],
        nama_satuan: 'liter',
        jumlah_dalam_satuan_dasar: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id_produk: productMap['P003'],
        nama_satuan: 'botol',
        jumlah_dalam_satuan_dasar: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    await queryInterface.bulkInsert('produk_satuan', units, {});

    // Get the inserted unit IDs
    const unitData = await queryInterface.sequelize.query(
      `SELECT id_satuan, id_produk, nama_satuan FROM produk_satuan`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Create a map of product ID and unit name to unit ID
    const unitMap = {};
    unitData.forEach(unit => {
      if (!unitMap[unit.id_produk]) {
        unitMap[unit.id_produk] = {};
      }
      unitMap[unit.id_produk][unit.nama_satuan] = unit.id_satuan;
    });

    // Add prices for all products
    const prices = [];
    
    // Indomie prices
    prices.push(
      {
        id_produk: productMap['P001'],
        id_satuan: unitMap[productMap['P001']]['pcs'],
        minimal_qty: 1,
        maksimal_qty: 39,
        harga_pokok: 2500,
        harga_jual: 3000,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id_produk: productMap['P001'],
        id_satuan: unitMap[productMap['P001']]['pcs'],
        minimal_qty: 40,
        maksimal_qty: null,
        harga_pokok: 2300,
        harga_jual: 2800,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id_produk: productMap['P001'],
        id_satuan: unitMap[productMap['P001']]['dus'],
        minimal_qty: 1,
        maksimal_qty: null,
        harga_pokok: 92000,
        harga_jual: 110000,
        created_at: new Date(),
        updated_at: new Date()
      }
    );
    
    // Beras prices
    prices.push(
      {
        id_produk: productMap['P002'],
        id_satuan: unitMap[productMap['P002']]['kg'],
        minimal_qty: 1,
        maksimal_qty: 24,
        harga_pokok: 12000,
        harga_jual: 14000,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id_produk: productMap['P002'],
        id_satuan: unitMap[productMap['P002']]['kg'],
        minimal_qty: 25,
        maksimal_qty: null,
        harga_pokok: 11500,
        harga_jual: 13500,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id_produk: productMap['P002'],
        id_satuan: unitMap[productMap['P002']]['karung'],
        minimal_qty: 1,
        maksimal_qty: null,
        harga_pokok: 275000,
        harga_jual: 325000,
        created_at: new Date(),
        updated_at: new Date()
      }
    );
    
    // Minyak prices
    prices.push(
      {
        id_produk: productMap['P003'],
        id_satuan: unitMap[productMap['P003']]['liter'],
        minimal_qty: 1,
        maksimal_qty: null,
        harga_pokok: 18000,
        harga_jual: 21000,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id_produk: productMap['P003'],
        id_satuan: unitMap[productMap['P003']]['botol'],
        minimal_qty: 1,
        maksimal_qty: null,
        harga_pokok: 18000,
        harga_jual: 21000,
        created_at: new Date(),
        updated_at: new Date()
      }
    );

    await queryInterface.bulkInsert('produk_harga', prices, {});

    // Add stock for all products
    const stocks = [
      // Indomie stock
      {
        id_produk: productMap['P001'],
        id_satuan: unitMap[productMap['P001']]['pcs'],
        jumlah_stok: 120,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id_produk: productMap['P001'],
        id_satuan: unitMap[productMap['P001']]['dus'],
        jumlah_stok: 3,
        created_at: new Date(),
        updated_at: new Date()
      },
      // Beras stock
      {
        id_produk: productMap['P002'],
        id_satuan: unitMap[productMap['P002']]['kg'],
        jumlah_stok: 75,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id_produk: productMap['P002'],
        id_satuan: unitMap[productMap['P002']]['karung'],
        jumlah_stok: 3,
        created_at: new Date(),
        updated_at: new Date()
      },
      // Minyak stock
      {
        id_produk: productMap['P003'],
        id_satuan: unitMap[productMap['P003']]['liter'],
        jumlah_stok: 50,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id_produk: productMap['P003'],
        id_satuan: unitMap[productMap['P003']]['botol'],
        jumlah_stok: 50,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    await queryInterface.bulkInsert('produk_stok', stocks, {});

    console.log('Sample product data has been seeded');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('produk_stok', null, {});
    await queryInterface.bulkDelete('produk_harga', null, {});
    await queryInterface.bulkDelete('produk_satuan', null, {});
    await queryInterface.bulkDelete('produk_varian', null, {});
    await queryInterface.bulkDelete('produk', null, {});
    
    console.log('Sample product data has been removed');
  }
};
