// MongoDB Initialization Script
// This script runs when MongoDB container starts for the first time

print('Starting MongoDB initialization...');

// Switch to the application database
db = db.getSiblingDB('Endex_Store');

// Create application user with read/write permissions
db.createUser({
  user: 'zenstore_user',
  pwd: 'zenstore_password_2024',
  roles: [
    {
      role: 'readWrite',
      db: 'Endex_Store'
    }
  ]
});

// Create indexes for better performance
print('Creating indexes...');

// Users collection indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "createdAt": 1 });
db.users.createIndex({ "role": 1 });

// Orders collection indexes
db.orders.createIndex({ "userId": 1 });
db.orders.createIndex({ "status": 1 });
db.orders.createIndex({ "createdAt": -1 });
db.orders.createIndex({ "orderNumber": 1 }, { unique: true });

// Products/Packages collection indexes
db.packages.createIndex({ "name": 1 });
db.packages.createIndex({ "category": 1 });
db.packages.createIndex({ "price": 1 });
db.packages.createIndex({ "isActive": 1 });
db.packages.createIndex({ "createdAt": -1 });

// Categories collection indexes
db.categories.createIndex({ "name": 1 }, { unique: true });
db.categories.createIndex({ "isActive": 1 });

// Games collection indexes
db.games.createIndex({ "name": 1 });
db.games.createIndex({ "isActive": 1 });

// Coupons collection indexes
db.coupons.createIndex({ "code": 1 }, { unique: true });
db.coupons.createIndex({ "isActive": 1 });
db.coupons.createIndex({ "expiryDate": 1 });

// Sessions collection (if using MongoDB for sessions)
db.sessions.createIndex({ "expires": 1 }, { expireAfterSeconds: 0 });

print('MongoDB initialization completed successfully!');
print('Database: Endex_Store');
print('User: zenstore_user created with readWrite permissions');
print('Indexes created for optimal performance');