const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedData() {
  try {
    console.log('Creating tables and seeding data...');
    
    const { data: existingAppts } = await supabase
      .from('appointments')
      .select('id')
      .limit(1);
    
    if (existingAppts && existingAppts.length > 0) {
      console.log('Tables already exist with data. Skipping seed.');
      
      const { count: aptCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true });
      
      const { count: txCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });
      
      console.log('Current appointments:', aptCount);
      console.log('Current transactions:', txCount);
      return;
    }
    
    const testUserId = 'f9730252-8997-45ee-8750-6f9843cbf4e3';
    let appointmentsCreated = 0;
    let transactionsCreated = 0;
    
    for (let i = 0; i < 30; i++) {
      const appointmentId = crypto.randomUUID();
      const serviceType = i % 3 === 0 ? 'haircut' : i % 3 === 1 ? 'beard_trim' : 'full_service';
      const price = i % 3 === 0 ? 35 : i % 3 === 1 ? 25 : 55;
      
      const startTime = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(11, 0, 0, 0);
      
      const { data: apt, error: aptError } = await supabase.from('appointments').insert({
        id: appointmentId,
        customer_id: testUserId,
        barber_id: crypto.randomUUID(),
        service_id: serviceType,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'completed',
        price: price
      }).select();
      
      if (!aptError && apt) {
        appointmentsCreated++;
        
        const { data: tx, error: txError } = await supabase.from('transactions').insert({
          appointment_id: appointmentId,
          customer_id: testUserId,
          amount: price,
          type: 'payment',
          payment_method: i % 2 === 0 ? 'card' : 'cash',
          status: 'completed',
          description: `Payment for ${serviceType}`
        }).select();
        
        if (!txError && tx) {
          transactionsCreated++;
        }
      } else if (aptError) {
        console.log('Appointment error:', aptError.message);
      }
      
      if (i % 2 === 0) {
        const afternoonId = crypto.randomUUID();
        const afternoonStart = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
        afternoonStart.setHours(15, 0, 0, 0);
        const afternoonEnd = new Date(afternoonStart);
        afternoonEnd.setHours(16, 0, 0, 0);
        
        const { data: apt2, error: apt2Error } = await supabase.from('appointments').insert({
          id: afternoonId,
          customer_id: testUserId,
          barber_id: crypto.randomUUID(),
          service_id: serviceType,
          start_time: afternoonStart.toISOString(),
          end_time: afternoonEnd.toISOString(),
          status: 'completed',
          price: price
        }).select();
        
        if (!apt2Error && apt2) {
          appointmentsCreated++;
          
          const { data: tx2, error: tx2Error } = await supabase.from('transactions').insert({
            appointment_id: afternoonId,
            customer_id: testUserId,
            amount: price,
            type: 'payment',
            payment_method: 'card',
            status: 'completed',
            description: `Payment for ${serviceType}`
          }).select();
          
          if (!tx2Error && tx2) {
            transactionsCreated++;
          }
        }
      }
    }
    
    console.log('✅ Sample data inserted successfully!');
    console.log('Appointments created:', appointmentsCreated);
    console.log('Transactions created:', transactionsCreated);
    
    const { data: allTransactions } = await supabase
      .from('transactions')
      .select('amount')
      .eq('customer_id', testUserId);
    
    if (allTransactions) {
      const totalRevenue = allTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      console.log('Total revenue in database: $', totalRevenue.toFixed(2));
      console.log('Average daily revenue: $', (totalRevenue / 30).toFixed(2));
    }
    
  } catch (error) {
    console.error('Error:', error);
    
    if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log('\n⚠️  Tables do not exist in Supabase.');
      console.log('Please create the tables first using Supabase dashboard or migration.');
      console.log('\nSQL to create tables:');
      console.log(`
-- Create appointments table
CREATE TABLE appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID,
  barber_id UUID,
  service_id TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'scheduled',
  price DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID,
  customer_id UUID,
  amount DECIMAL(10, 2),
  type TEXT DEFAULT 'payment',
  payment_method TEXT,
  status TEXT DEFAULT 'completed',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
      `);
    }
  }
}

seedData();