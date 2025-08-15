/**
 * Integration tests for database operations
 * Tests the async connection pool, repositories, and data integrity
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import pg from 'pg';
import { 
  createConnectionPool, 
  closePool, 
  executeQuery, 
  executeTransaction 
} from '../../database/async_connection_pool.py';
import {
  UserRepository,
  ShopRepository,
  AppointmentRepository,
  BusinessAnalyticsRepository
} from '../../database/async_repositories.py';

const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: process.env.TEST_DB_PORT || 5432,
  database: process.env.TEST_DB_NAME || 'test_6fb_booking',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'password',
  max: 5, // Smaller pool for testing
  idleTimeoutMillis: 1000,
  connectionTimeoutMillis: 2000,
};

describe('Database Operations Integration Tests', () => {
  let testPool;
  let userRepo;
  let shopRepo;
  let appointmentRepo;
  let analyticsRepo;

  beforeAll(async () => {
    await setupTestDatabase();
    
    testPool = await createConnectionPool(TEST_DB_CONFIG);
    
    userRepo = new UserRepository(testPool);
    shopRepo = new ShopRepository(testPool);
    appointmentRepo = new AppointmentRepository(testPool);
    analyticsRepo = new BusinessAnalyticsRepository(testPool);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    
    if (testPool) {
      await closePool(testPool);
    }
  });

  beforeEach(async () => {
    await clearTestData();
  });

  describe('Connection Pool Management', () => {
    it('should create connection pool successfully', async () => {
      const pool = await createConnectionPool(TEST_DB_CONFIG);
      expect(pool).toBeDefined();
      expect(pool.totalCount).toBe(0); // No connections created yet
      expect(pool.idleCount).toBe(0);
      await closePool(pool);
    });

    it('should handle multiple concurrent connections', async () => {
      const promises = [];
      const queryCount = 10;

      for (let i = 0; i < queryCount; i++) {
        promises.push(
          executeQuery(testPool, 'SELECT $1 as test_value', [i])
        );
      }

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(queryCount);
      results.forEach((result, index) => {
        expect(result.rows[0].test_value).toBe(index);
      });
    });

    it('should handle connection pool exhaustion gracefully', async () => {
      const poolConfig = { ...TEST_DB_CONFIG, max: 2 };
      const smallPool = await createConnectionPool(poolConfig);
      
      try {
        const promises = [];
        for (let i = 0; i < 5; i++) {
          promises.push(
            executeQuery(smallPool, 'SELECT pg_sleep(0.1), $1 as value', [i])
          );
        }

        const results = await Promise.all(promises);
        expect(results).toHaveLength(5);
      } finally {
        await closePool(smallPool);
      }
    });

    it('should handle connection errors and retry', async () => {
      const invalidConfig = { ...TEST_DB_CONFIG, port: 9999 };
      
      await expect(createConnectionPool(invalidConfig)).rejects.toThrow();
    });
  });

  describe('Transaction Management', () => {
    it('should commit successful transactions', async () => {
      const testUserId = 'test_user_' + Date.now();
      
      const result = await executeTransaction(testPool, async (client) => {
        await client.query(
          'INSERT INTO users (id, email, name, role) VALUES ($1, $2, $3, $4)',
          [testUserId, 'test@example.com', await getTestUserFromDatabase(), 'CLIENT']
        );
        
        await client.query(
          'INSERT INTO user_profiles (user_id, phone, preferences) VALUES ($1, $2, $3)',
          [testUserId, '+1234567890', '{"notifications": true}']
        );
        
        return { success: true, userId: testUserId };
      });

      expect(result.success).toBe(true);
      
      const userResult = await executeQuery(
        testPool, 
        'SELECT * FROM users WHERE id = $1', 
        [testUserId]
      );
      expect(userResult.rows).toHaveLength(1);
      expect(userResult.rows[0].email).toBe('test@example.com');
    });

    it('should rollback failed transactions', async () => {
      const testUserId = 'test_user_rollback_' + Date.now();
      
      try {
        await executeTransaction(testPool, async (client) => {
          await client.query(
            'INSERT INTO users (id, email, name, role) VALUES ($1, $2, $3, $4)',
            [testUserId, 'rollback@example.com', 'Rollback User', 'CLIENT']
          );
          
          throw new Error('Intentional transaction failure');
        });
      } catch (error) {
        expect(error.message).toBe('Intentional transaction failure');
      }

      const userResult = await executeQuery(
        testPool, 
        'SELECT * FROM users WHERE id = $1', 
        [testUserId]
      );
      expect(userResult.rows).toHaveLength(0);
    });

    it('should handle nested transactions correctly', async () => {
      const testUserId = 'test_nested_' + Date.now();
      
      const result = await executeTransaction(testPool, async (outerClient) => {
        await outerClient.query(
          'INSERT INTO users (id, email, name, role) VALUES ($1, $2, $3, $4)',
          [testUserId, 'nested@example.com', 'Nested User', 'CLIENT']
        );
        
        await outerClient.query('SAVEPOINT nested_operation');
        
        try {
          await outerClient.query(
            'INSERT INTO user_profiles (user_id, phone) VALUES ($1, $2)',
            [testUserId, '+1234567890']
          );
          await outerClient.query('RELEASE SAVEPOINT nested_operation');
        } catch (error) {
          await outerClient.query('ROLLBACK TO SAVEPOINT nested_operation');
          throw error;
        }
        
        return { success: true };
      });

      expect(result.success).toBe(true);
    });
  });

  describe('User Repository Operations', () => {
    it('should create and retrieve users', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        role: 'CLIENT',
        password_hash: 'hashed_password_123'
      };

      const createdUser = await userRepo.create(userData);
      
      expect(createdUser).toBeDefined();
      expect(createdUser.id).toBeDefined();
      expect(createdUser.email).toBe(userData.email);
      expect(createdUser.role).toBe(userData.role);

      const retrievedUser = await userRepo.findById(createdUser.id);
      expect(retrievedUser).toBeDefined();
      expect(retrievedUser.email).toBe(userData.email);

      const userByEmail = await userRepo.findByEmail(userData.email);
      expect(userByEmail).toBeDefined();
      expect(userByEmail.id).toBe(createdUser.id);
    });

    it('should update user information', async () => {
      const userData = {
        email: 'updateuser@example.com',
        name: 'Update User',
        role: 'CLIENT',
        password_hash: 'hashed_password_123'
      };
      const user = await userRepo.create(userData);

      const updateData = {
        name: 'Updated Name',
        phone: '+9876543210'
      };
      const updatedUser = await userRepo.update(user.id, updateData);

      expect(updatedUser.name).toBe(updateData.name);
      expect(updatedUser.updated_at).toBeDefined();
      
      const retrievedUser = await userRepo.findById(user.id);
      expect(retrievedUser.name).toBe(updateData.name);
    });

    it('should handle user role-based queries', async () => {
      const users = [
        { email: 'client@example.com', name: 'Client User', role: 'CLIENT' },
        { email: 'barber@example.com', name: 'Barber User', role: 'BARBER' },
        { email: 'owner@example.com', name: 'Owner User', role: 'SHOP_OWNER' }
      ];

      const createdUsers = [];
      for (const userData of users) {
        const user = await userRepo.create({
          ...userData,
          password_hash: 'hash_' + userData.role
        });
        createdUsers.push(user);
      }

      const barbers = await userRepo.findByRole('BARBER');
      expect(barbers).toHaveLength(1);
      expect(barbers[0].role).toBe('BARBER');

      const shopOwners = await userRepo.findByRole('SHOP_OWNER');
      expect(shopOwners).toHaveLength(1);
      expect(shopOwners[0].role).toBe('SHOP_OWNER');
    });

    it('should handle user authentication data', async () => {
      const userData = {
        email: 'auth@example.com',
        name: 'Auth User',
        role: 'CLIENT',
        password_hash: 'secure_hash_12345'
      };

      const user = await userRepo.create(userData);
      
      expect(user.password_hash).toBeUndefined(); // Should not be returned in queries
      
      const authResult = await userRepo.verifyCredentials(
        userData.email, 
        'plaintext_password'
      );
      expect(authResult).toBeDefined();
    });
  });

  describe('Shop Repository Operations', () => {
    let testOwner;

    beforeEach(async () => {
      testOwner = await userRepo.create({
        email: 'shopowner@example.com',
        name: 'Shop Owner',
        role: 'SHOP_OWNER',
        password_hash: 'hash_owner'
      });
    });

    it('should create and manage barbershops', async () => {
      const shopData = {
        name: 'Test Barbershop',
        owner_id: testOwner.id,
        address: '123 Main St, City, State 12345',
        phone: '+1234567890',
        email: 'shop@example.com',
        business_hours: {
          monday: { open: '09:00', close: '18:00' },
          tuesday: { open: '09:00', close: '18:00' },
          wednesday: { closed: true },
          thursday: { open: '09:00', close: '18:00' },
          friday: { open: '09:00', close: '20:00' },
          saturday: { open: '08:00', close: '17:00' },
          sunday: { closed: true }
        }
      };

      const shop = await shopRepo.create(shopData);
      
      expect(shop).toBeDefined();
      expect(shop.id).toBeDefined();
      expect(shop.name).toBe(shopData.name);
      expect(shop.owner_id).toBe(testOwner.id);
      expect(shop.business_hours).toEqual(shopData.business_hours);

      const retrievedShop = await shopRepo.findById(shop.id);
      expect(retrievedShop.name).toBe(shopData.name);
    });

    it('should manage shop services and pricing', async () => {
      const shop = await shopRepo.create({
        name: 'Service Test Shop',
        owner_id: testOwner.id,
        address: '456 Service St',
        phone: '+1234567890'
      });

      const services = [
        { name: 'Haircut', price: 35.00, duration: 30, description: 'Standard haircut' },
        { name: 'Beard Trim', price: 25.00, duration: 20, description: 'Beard trimming and styling' },
        { name: 'Full Service', price: 55.00, duration: 50, description: 'Haircut and beard trim' }
      ];

      const createdServices = [];
      for (const serviceData of services) {
        const service = await shopRepo.addService(shop.id, serviceData);
        createdServices.push(service);
      }

      expect(createdServices).toHaveLength(3);

      const shopServices = await shopRepo.getServices(shop.id);
      expect(shopServices).toHaveLength(3);
      expect(shopServices.find(s => s.name === 'Haircut').price).toBe(35.00);
    });

    it('should handle shop staff management', async () => {
      const shop = await shopRepo.create({
        name: 'Staff Test Shop',
        owner_id: testOwner.id,
        address: '789 Staff Ave',
        phone: '+1234567890'
      });

      const barber1 = await userRepo.create({
        email: 'barber1@example.com',
        name: 'Barber One',
        role: 'BARBER',
        password_hash: 'hash_barber1'
      });

      const barber2 = await userRepo.create({
        email: 'barber2@example.com',
        name: 'Barber Two',
        role: 'BARBER',
        password_hash: 'hash_barber2'
      });

      await shopRepo.addStaff(shop.id, barber1.id, {
        position: 'Senior Barber',
        hourly_rate: 25.00,
        commission_rate: 0.15
      });

      await shopRepo.addStaff(shop.id, barber2.id, {
        position: 'Junior Barber',
        hourly_rate: 20.00,
        commission_rate: 0.10
      });

      const staff = await shopRepo.getStaff(shop.id);
      expect(staff).toHaveLength(2);
      
      const seniorBarber = staff.find(s => s.position === 'Senior Barber');
      expect(seniorBarber).toBeDefined();
      expect(seniorBarber.hourly_rate).toBe(25.00);
    });
  });

  describe('Appointment Repository Operations', () => {
    let testClient, testBarber, testShop, testService;

    beforeEach(async () => {
      testClient = await userRepo.create({
        email: 'client@example.com',
        name: 'Test Client',
        role: 'CLIENT',
        password_hash: 'hash_client'
      });

      const shopOwner = await userRepo.create({
        email: 'owner@example.com',
        name: 'Shop Owner',
        role: 'SHOP_OWNER',
        password_hash: 'hash_owner'
      });

      testBarber = await userRepo.create({
        email: 'barber@example.com',
        name: 'Test Barber',
        role: 'BARBER',
        password_hash: 'hash_barber'
      });

      testShop = await shopRepo.create({
        name: 'Appointment Test Shop',
        owner_id: shopOwner.id,
        address: '123 Appointment St',
        phone: '+1234567890'
      });

      testService = await shopRepo.addService(testShop.id, {
        name: 'Test Haircut',
        price: 35.00,
        duration: 30
      });

      await shopRepo.addStaff(testShop.id, testBarber.id, {
        position: 'Barber',
        hourly_rate: 22.00,
        commission_rate: 0.12
      });
    });

    it('should create and manage appointments', async () => {
      const appointmentData = {
        client_id: testClient.id,
        barber_id: testBarber.id,
        shop_id: testShop.id,
        service_id: testService.id,
        scheduled_time: new Date('2024-02-15T10:00:00Z'),
        notes: 'Client prefers fade cut'
      };

      const appointment = await appointmentRepo.create(appointmentData);
      
      expect(appointment).toBeDefined();
      expect(appointment.id).toBeDefined();
      expect(appointment.client_id).toBe(testClient.id);
      expect(appointment.status).toBe('scheduled');
      expect(appointment.total_price).toBe(testService.price);

      const retrieved = await appointmentRepo.findById(appointment.id);
      expect(retrieved.notes).toBe(appointmentData.notes);
    });

    it('should handle appointment status updates', async () => {
      const appointment = await appointmentRepo.create({
        client_id: testClient.id,
        barber_id: testBarber.id,
        shop_id: testShop.id,
        service_id: testService.id,
        scheduled_time: new Date('2024-02-15T11:00:00Z')
      });

      const confirmed = await appointmentRepo.updateStatus(
        appointment.id, 
        'confirmed',
        { confirmed_by: testBarber.id }
      );
      expect(confirmed.status).toBe('confirmed');

      const completed = await appointmentRepo.updateStatus(
        appointment.id, 
        'completed',
        { 
          completed_at: new Date(),
          actual_duration: 35,
          tip_amount: 5.00
        }
      );
      expect(completed.status).toBe('completed');
      expect(completed.tip_amount).toBe(5.00);
    });

    it('should handle appointment scheduling conflicts', async () => {
      const scheduledTime = new Date('2024-02-15T14:00:00Z');
      
      const appointment1 = await appointmentRepo.create({
        client_id: testClient.id,
        barber_id: testBarber.id,
        shop_id: testShop.id,
        service_id: testService.id,
        scheduled_time: scheduledTime
      });

      const conflictingTime = new Date('2024-02-15T14:15:00Z'); // 15 minutes overlap
      
      await expect(appointmentRepo.create({
        client_id: testClient.id, // Different client, same barber
        barber_id: testBarber.id,
        shop_id: testShop.id,
        service_id: testService.id,
        scheduled_time: conflictingTime
      })).rejects.toThrow(/scheduling conflict/i);
    });

    it('should query appointments by various criteria', async () => {
      const baseTime = new Date('2024-02-15T09:00:00Z');
      
      const appointments = [];
      for (let i = 0; i < 5; i++) {
        const appointmentTime = new Date(baseTime.getTime() + (i * 60 * 60 * 1000)); // 1 hour apart
        const appointment = await appointmentRepo.create({
          client_id: testClient.id,
          barber_id: testBarber.id,
          shop_id: testShop.id,
          service_id: testService.id,
          scheduled_time: appointmentTime
        });
        appointments.push(appointment);
      }

      const barberAppointments = await appointmentRepo.findByBarber(
        testBarber.id,
        new Date('2024-02-15T00:00:00Z'),
        new Date('2024-02-15T23:59:59Z')
      );
      expect(barberAppointments).toHaveLength(5);

      const clientAppointments = await appointmentRepo.findByClient(testClient.id);
      expect(clientAppointments).toHaveLength(5);

      const shopAppointments = await appointmentRepo.findByShop(
        testShop.id,
        new Date('2024-02-15T00:00:00Z'),
        new Date('2024-02-15T23:59:59Z')
      );
      expect(shopAppointments).toHaveLength(5);
    });
  });

  describe('Business Analytics Repository', () => {
    let testShop, testBarber, testClient, testService;

    beforeEach(async () => {
      const shopOwner = await userRepo.create({
        email: 'analyticsowner@example.com',
        name: 'Analytics Owner',
        role: 'SHOP_OWNER',
        password_hash: 'hash_owner'
      });

      testClient = await userRepo.create({
        email: 'analyticsclient@example.com',
        name: 'Analytics Client',
        role: 'CLIENT',
        password_hash: 'hash_client'
      });

      testBarber = await userRepo.create({
        email: 'analyticsbarber@example.com',
        name: 'Analytics Barber',
        role: 'BARBER',
        password_hash: 'hash_barber'
      });

      testShop = await shopRepo.create({
        name: 'Analytics Test Shop',
        owner_id: shopOwner.id,
        address: '123 Analytics St',
        phone: '+1234567890'
      });

      testService = await shopRepo.addService(testShop.id, {
        name: 'Analytics Haircut',
        price: 40.00,
        duration: 30
      });

      await shopRepo.addStaff(testShop.id, testBarber.id, {
        position: 'Barber',
        hourly_rate: 25.00,
        commission_rate: 0.15
      });
    });

    it('should calculate revenue analytics', async () => {
      const appointments = [];
      const baseTime = new Date('2024-01-01T10:00:00Z');
      
      for (let i = 0; i < 10; i++) {
        const appointmentTime = new Date(baseTime.getTime() + (i * 24 * 60 * 60 * 1000)); // Daily appointments
        const appointment = await appointmentRepo.create({
          client_id: testClient.id,
          barber_id: testBarber.id,
          shop_id: testShop.id,
          service_id: testService.id,
          scheduled_time: appointmentTime
        });

        await appointmentRepo.updateStatus(appointment.id, 'completed', {
          completed_at: new Date(appointmentTime.getTime() + (30 * 60 * 1000)), // 30 minutes later
          tip_amount: 5.00
        });

        appointments.push(appointment);
      }

      const revenueData = await analyticsRepo.getRevenueAnalytics(
        testShop.id,
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-31T23:59:59Z')
      );

      expect(revenueData).toBeDefined();
      expect(revenueData.total_revenue).toBe(450.00); // 10 appointments * (40 + 5) tip
      expect(revenueData.total_appointments).toBe(10);
      expect(revenueData.average_per_appointment).toBe(45.00);
      expect(revenueData.daily_breakdown).toHaveLength(10);
    });

    it('should analyze customer metrics', async () => {
      const clients = [];
      for (let i = 0; i < 5; i++) {
        const client = await userRepo.create({
          email: `customer${i}@example.com`,
          name: `Customer ${i}`,
          role: 'CLIENT',
          password_hash: `hash_${i}`
        });
        clients.push(client);

        const appointmentCount = i + 1; // 1 to 5 appointments per client
        for (let j = 0; j < appointmentCount; j++) {
          const appointment = await appointmentRepo.create({
            client_id: client.id,
            barber_id: testBarber.id,
            shop_id: testShop.id,
            service_id: testService.id,
            scheduled_time: new Date(`2024-01-${(j + 1).toString().padStart(2, '0')}T10:00:00Z`)
          });

          await appointmentRepo.updateStatus(appointment.id, 'completed', {
            completed_at: new Date(appointment.scheduled_time.getTime() + (30 * 60 * 1000))
          });
        }
      }

      const customerMetrics = await analyticsRepo.getCustomerAnalytics(
        testShop.id,
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-31T23:59:59Z')
      );

      expect(customerMetrics.total_customers).toBe(5);
      expect(customerMetrics.total_appointments).toBe(15); // 1+2+3+4+5
      expect(customerMetrics.repeat_customers).toBe(4); // Customers with > 1 appointment
      expect(customerMetrics.retention_rate).toBeCloseTo(0.8); // 4/5 = 80%
    });

    it('should track barber performance', async () => {
      const barber2 = await userRepo.create({
        email: 'barber2@example.com',
        name: 'Second Barber',
        role: 'BARBER',
        password_hash: 'hash_barber2'
      });

      await shopRepo.addStaff(testShop.id, barber2.id, {
        position: 'Barber',
        hourly_rate: 20.00,
        commission_rate: 0.12
      });

      const appointments1 = [];
      const appointments2 = [];

      for (let i = 0; i < 5; i++) {
        const appt1 = await appointmentRepo.create({
          client_id: testClient.id,
          barber_id: testBarber.id,
          shop_id: testShop.id,
          service_id: testService.id,
          scheduled_time: new Date(`2024-01-${(i + 1).toString().padStart(2, '0')}T10:00:00Z`)
        });
        await appointmentRepo.updateStatus(appt1.id, 'completed', {
          completed_at: new Date(appt1.scheduled_time.getTime() + (25 * 60 * 1000)), // Efficient: 25 min
          tip_amount: 8.00
        });
        appointments1.push(appt1);

        const appt2 = await appointmentRepo.create({
          client_id: testClient.id,
          barber_id: barber2.id,
          shop_id: testShop.id,
          service_id: testService.id,
          scheduled_time: new Date(`2024-01-${(i + 1).toString().padStart(2, '0')}T14:00:00Z`)
        });
        await appointmentRepo.updateStatus(appt2.id, 'completed', {
          completed_at: new Date(appt2.scheduled_time.getTime() + (35 * 60 * 1000)), // Slower: 35 min
          tip_amount: 5.00
        });
        appointments2.push(appt2);
      }

      const barberPerformance = await analyticsRepo.getBarberPerformance(
        testShop.id,
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-31T23:59:59Z')
      );

      expect(barberPerformance).toHaveLength(2);
      
      const barber1Stats = barberPerformance.find(b => b.barber_id === testBarber.id);
      const barber2Stats = barberPerformance.find(b => b.barber_id === barber2.id);

      expect(barber1Stats.total_appointments).toBe(5);
      expect(barber1Stats.average_tip).toBe(8.00);
      expect(barber1Stats.average_duration).toBe(25);
      
      expect(barber2Stats.total_appointments).toBe(5);
      expect(barber2Stats.average_tip).toBe(5.00);
      expect(barber2Stats.average_duration).toBe(35);
    });

    it('should generate comprehensive business insights', async () => {
      const insights = await analyticsRepo.getBusinessInsights(
        testShop.id,
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-31T23:59:59Z')
      );

      expect(insights).toHaveProperty('revenue_summary');
      expect(insights).toHaveProperty('customer_summary');
      expect(insights).toHaveProperty('service_performance');
      expect(insights).toHaveProperty('staff_performance');
      expect(insights).toHaveProperty('trends');
      expect(insights).toHaveProperty('recommendations');

      expect(insights.revenue_summary).toHaveProperty('total');
      expect(insights.revenue_summary).toHaveProperty('growth_rate');
      expect(insights.customer_summary).toHaveProperty('total_customers');
      expect(insights.customer_summary).toHaveProperty('retention_rate');
    });
  });

  describe('Vector Embeddings Integration', () => {
    let vectorRepo;

    beforeEach(async () => {
      vectorRepo = new VectorEmbeddingsRepository(testPool);
    });

    it('should store and retrieve vector embeddings', async () => {
      const testEmbedding = await fetchFromDatabase({ limit: 384 }, () => Math.random());
      const metadata = {
        content_type: 'business_knowledge',
        source: 'revenue_optimization',
        title: 'Increase barbershop revenue strategies'
      };

      const embeddingId = await vectorRepo.storeEmbedding(
        testEmbedding,
        metadata
      );

      expect(embeddingId).toBeDefined();

      const retrieved = await vectorRepo.getEmbedding(embeddingId);
      expect(retrieved.embedding).toHaveLength(384);
      expect(retrieved.metadata.source).toBe('revenue_optimization');
    });

    it('should perform similarity search on embeddings', async () => {
      const embeddings = [];
      for (let i = 0; i < 10; i++) {
        const embedding = await fetchFromDatabase({ limit: 384 }, () => Math.random());
        const metadata = {
          content_type: 'business_tip',
          source: `tip_${i}`,
          title: `Business tip ${i}`
        };
        
        const embeddingId = await vectorRepo.storeEmbedding(embedding, metadata);
        embeddings.push({ id: embeddingId, embedding, metadata });
      }

      const queryEmbedding = await fetchFromDatabase({ limit: 384 }, () => Math.random());
      const similarResults = await vectorRepo.similaritySearch(
        queryEmbedding,
        5, // top 5 results
        0.7 // similarity threshold
      );

      expect(similarResults).toHaveLength(5);
      expect(similarResults[0]).toHaveProperty('similarity_score');
      expect(similarResults[0]).toHaveProperty('metadata');
      
      for (let i = 1; i < similarResults.length; i++) {
        expect(similarResults[i-1].similarity_score).toBeGreaterThanOrEqual(
          similarResults[i].similarity_score
        );
      }
    });
  });

  describe('Data Integrity and Constraints', () => {
    it('should enforce foreign key constraints', async () => {
      await expect(appointmentRepo.create({
        client_id: 'non-existent-client',
        barber_id: 'non-existent-barber',
        shop_id: 'non-existent-shop',
        service_id: 'non-existent-service',
        scheduled_time: new Date()
      })).rejects.toThrow();
    });

    it('should enforce unique constraints', async () => {
      const userData = {
        email: 'unique@example.com',
        name: 'Unique User',
        role: 'CLIENT',
        password_hash: 'hash_unique'
      };

      await userRepo.create(userData);

      await expect(userRepo.create(userData)).rejects.toThrow(/duplicate/i);
    });

    it('should validate data types and ranges', async () => {
      await expect(shopRepo.addService('shop_id', {
        name: 'Invalid Service',
        price: -10.00, // Negative price should be invalid
        duration: 30
      })).rejects.toThrow();

      await expect(shopRepo.addService('shop_id', {
        name: 'Invalid Duration Service',
        price: 35.00,
        duration: 0 // Zero duration should be invalid
      })).rejects.toThrow();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large dataset queries efficiently', async () => {
      if (process.env.SKIP_PERFORMANCE_TESTS) {
        return;
      }

      const startTime = Date.now();
      
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(userRepo.create({
          email: `perf${i}@example.com`,
          name: `Performance User ${i}`,
          role: 'CLIENT',
          password_hash: `hash_${i}`
        }));
      }

      await Promise.all(promises);
      
      const creationTime = Date.now() - startTime;
      console.log(`Created 1000 users in ${creationTime}ms`);

      const queryStartTime = Date.now();
      const users = await userRepo.findByRole('CLIENT', { limit: 100, offset: 0 });
      const queryTime = Date.now() - queryStartTime;

      expect(users).toHaveLength(100);
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
      console.log(`Queried 100 users from 1000+ in ${queryTime}ms`);
    });

    it('should use database indexes effectively', async () => {
      const explainResult = await executeQuery(
        testPool,
        'EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );

      const plan = explainResult.rows[0]['QUERY PLAN'];
      expect(plan).toMatch(/Index Scan/i);
      expect(plan).not.toMatch(/Seq Scan/i);
    });
  });
});

async function setupTestDatabase() {
  const adminClient = new pg.Client({
    host: TEST_DB_CONFIG.host,
    port: TEST_DB_CONFIG.port,
    database: 'postgres',
    user: TEST_DB_CONFIG.user,
    password: TEST_DB_CONFIG.password,
  });

  try {
    await adminClient.connect();
    
    await adminClient.query(`DROP DATABASE IF EXISTS ${TEST_DB_CONFIG.database}`);
    await adminClient.query(`CREATE DATABASE ${TEST_DB_CONFIG.database}`);
    
  } finally {
    await adminClient.end();
  }

  const testClient = new pg.Client(TEST_DB_CONFIG);
  try {
    await testClient.connect();
    
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, '../../database/complete-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await testClient.query(schema);
    
  } finally {
    await testClient.end();
  }
}

async function cleanupTestDatabase() {
  const adminClient = new pg.Client({
    host: TEST_DB_CONFIG.host,
    port: TEST_DB_CONFIG.port,
    database: 'postgres',
    user: TEST_DB_CONFIG.user,
    password: TEST_DB_CONFIG.password,
  });

  try {
    await adminClient.connect();
    await adminClient.query(`DROP DATABASE IF EXISTS ${TEST_DB_CONFIG.database}`);
  } finally {
    await adminClient.end();
  }
}

async function clearTestData() {
  if (!testPool) return;

  const tables = [
    'appointment_services',
    'appointments', 
    'shop_staff',
    'services',
    'user_profiles',
    'shops',
    'users',
    'business_analytics',
    'vector_embeddings'
  ];

  for (const table of tables) {
    try {
      await executeQuery(testPool, `TRUNCATE TABLE ${table} CASCADE`);
    } catch (error) {
      console.warn(`Could not truncate table ${table}:`, error.message);
    }
  }
}

class VectorEmbeddingsRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async storeEmbedding(embedding, metadata) {
    const result = await executeQuery(
      this.pool,
      `INSERT INTO vector_embeddings (embedding, metadata) 
       VALUES ($1::vector, $2) RETURNING id`,
      [JSON.stringify(embedding), JSON.stringify(metadata)]
    );
    return result.rows[0].id;
  }

  async getEmbedding(id) {
    const result = await executeQuery(
      this.pool,
      'SELECT embedding, metadata FROM vector_embeddings WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return null;
    
    return {
      embedding: JSON.parse(result.rows[0].embedding),
      metadata: JSON.parse(result.rows[0].metadata)
    };
  }

  async similaritySearch(queryEmbedding, limit = 10, threshold = 0.7) {
    const result = await executeQuery(
      this.pool,
      `SELECT id, metadata, 
              (embedding <=> $1::vector) as distance,
              (1 - (embedding <=> $1::vector)) as similarity_score
       FROM vector_embeddings
       WHERE (1 - (embedding <=> $1::vector)) >= $2
       ORDER BY similarity_score DESC
       LIMIT $3`,
      [JSON.stringify(queryEmbedding), threshold, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      metadata: JSON.parse(row.metadata),
      similarity_score: parseFloat(row.similarity_score)
    }));
  }
}