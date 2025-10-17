# Transaction Query Examples

Quick reference guide for querying financial transaction data from the 6FB barbershop system.

---

## Basic Transaction Queries

### Get All Transactions

```javascript
const { data: transactions } = await supabase
  .from('transactions')
  .select('*')
  .order('created_at', { ascending: false });
```

### Get Transactions with Appointment Details

```javascript
const { data: transactions } = await supabase
  .from('transactions')
  .select(`
    *,
    appointments (
      id,
      scheduled_at,
      status,
      client_name,
      services (
        name,
        price,
        duration_minutes
      )
    )
  `)
  .order('created_at', { ascending: false });
```

---

## Financial Analytics Queries

### Calculate Total Revenue

```javascript
// Get all completed transactions
const { data: transactions } = await supabase
  .from('transactions')
  .select('amount, description')
  .eq('status', 'COMPLETED');

// Calculate revenue and commissions
let totalRevenue = 0;
let totalTips = 0;
let totalCommissions = 0;

transactions.forEach(tx => {
  const metadata = JSON.parse(tx.description || '{}');
  const tipAmount = metadata.tip_amount || 0;
  const serviceRevenue = tx.amount - tipAmount;

  totalRevenue += serviceRevenue;
  totalTips += tipAmount;
  totalCommissions += metadata.commission_amount || 0;
});

console.log({
  totalRevenue,
  totalTips,
  totalCommissions,
  shopRevenue: totalRevenue - totalCommissions
});
```

### Revenue by Location

```javascript
const { data: transactions } = await supabase
  .from('transactions')
  .select(`
    amount,
    description,
    appointments!inner (
      barbershops (
        id,
        name
      )
    )
  `)
  .eq('status', 'COMPLETED');

// Group by location
const byLocation = {};

transactions.forEach(tx => {
  const shopName = tx.appointments?.barbershops?.name || 'Unknown';
  const metadata = JSON.parse(tx.description || '{}');
  const tipAmount = metadata.tip_amount || 0;
  const serviceRevenue = tx.amount - tipAmount;

  if (!byLocation[shopName]) {
    byLocation[shopName] = {
      count: 0,
      revenue: 0,
      tips: 0,
      commissions: 0
    };
  }

  byLocation[shopName].count++;
  byLocation[shopName].revenue += serviceRevenue;
  byLocation[shopName].tips += tipAmount;
  byLocation[shopName].commissions += metadata.commission_amount || 0;
});

console.log(byLocation);
```

### Barber Earnings Report

```javascript
const { data: transactions } = await supabase
  .from('transactions')
  .select(`
    amount,
    description,
    appointments (
      barber_id,
      profiles (
        first_name,
        last_name
      )
    )
  `)
  .eq('status', 'COMPLETED');

// Group by barber
const barberEarnings = {};

transactions.forEach(tx => {
  const metadata = JSON.parse(tx.description || '{}');
  const barberId = metadata.barber_id;
  const barberName = `${tx.appointments?.profiles?.first_name || ''} ${tx.appointments?.profiles?.last_name || ''}`.trim();

  if (!barberEarnings[barberId]) {
    barberEarnings[barberId] = {
      name: barberName,
      totalCommissions: 0,
      totalTips: 0,
      transactionCount: 0
    };
  }

  barberEarnings[barberId].totalCommissions += metadata.commission_amount || 0;
  barberEarnings[barberId].totalTips += metadata.tip_amount || 0;
  barberEarnings[barberId].transactionCount++;
});

console.log(barberEarnings);
```

---

## Payment Method Analysis

### Payment Method Distribution

```javascript
const { data: transactions } = await supabase
  .from('transactions')
  .select('payment_method, amount')
  .eq('status', 'COMPLETED');

const paymentMethods = {
  CARD: { count: 0, total: 0 },
  DIGITAL_WALLET: { count: 0, total: 0 },
  CASH: { count: 0, total: 0 }
};

transactions.forEach(tx => {
  const method = tx.payment_method?.toUpperCase() || 'CARD';
  if (paymentMethods[method]) {
    paymentMethods[method].count++;
    paymentMethods[method].total += tx.amount;
  }
});

console.log(paymentMethods);
```

---

## Time-Based Queries

### Revenue by Date Range

```javascript
const startDate = '2025-10-01';
const endDate = '2025-10-31';

const { data: transactions } = await supabase
  .from('transactions')
  .select('amount, description, created_at')
  .eq('status', 'COMPLETED')
  .gte('created_at', startDate)
  .lte('created_at', endDate);

let totalRevenue = 0;
transactions.forEach(tx => {
  const metadata = JSON.parse(tx.description || '{}');
  const tipAmount = metadata.tip_amount || 0;
  totalRevenue += (tx.amount - tipAmount);
});

console.log(`Revenue from ${startDate} to ${endDate}: $${totalRevenue.toFixed(2)}`);
```

### Daily Revenue Summary

```javascript
const { data: transactions } = await supabase
  .from('transactions')
  .select('amount, description, created_at')
  .eq('status', 'COMPLETED')
  .order('created_at', { ascending: true });

const dailyRevenue = {};

transactions.forEach(tx => {
  const date = new Date(tx.created_at).toISOString().split('T')[0];
  const metadata = JSON.parse(tx.description || '{}');
  const tipAmount = metadata.tip_amount || 0;
  const serviceRevenue = tx.amount - tipAmount;

  if (!dailyRevenue[date]) {
    dailyRevenue[date] = {
      count: 0,
      revenue: 0,
      tips: 0
    };
  }

  dailyRevenue[date].count++;
  dailyRevenue[date].revenue += serviceRevenue;
  dailyRevenue[date].tips += tipAmount;
});

console.log(dailyRevenue);
```

---

## Commission Analysis

### Calculate Commission Owed to Barbers

```javascript
const { data: transactions } = await supabase
  .from('transactions')
  .select(`
    amount,
    description,
    appointments (
      barber_id,
      profiles (
        first_name,
        last_name,
        email
      )
    )
  `)
  .eq('status', 'COMPLETED');

const commissionsByBarber = {};

transactions.forEach(tx => {
  const metadata = JSON.parse(tx.description || '{}');
  const barberId = metadata.barber_id;
  const barberInfo = tx.appointments?.profiles;

  if (!commissionsByBarber[barberId]) {
    commissionsByBarber[barberId] = {
      barber: {
        id: barberId,
        name: `${barberInfo?.first_name || ''} ${barberInfo?.last_name || ''}`.trim(),
        email: barberInfo?.email
      },
      totalCommissions: 0,
      totalTips: 0,
      totalEarnings: 0,
      transactionCount: 0
    };
  }

  const commissionAmount = metadata.commission_amount || 0;
  const tipAmount = metadata.tip_amount || 0;

  commissionsByBarber[barberId].totalCommissions += commissionAmount;
  commissionsByBarber[barberId].totalTips += tipAmount;
  commissionsByBarber[barberId].totalEarnings += (commissionAmount + tipAmount);
  commissionsByBarber[barberId].transactionCount++;
});

// Convert to array and sort by earnings
const commissionReport = Object.values(commissionsByBarber)
  .sort((a, b) => b.totalEarnings - a.totalEarnings);

console.log('Commission Report:');
commissionReport.forEach(barber => {
  console.log(`${barber.barber.name}: $${barber.totalEarnings.toFixed(2)}`);
  console.log(`  Commissions: $${barber.totalCommissions.toFixed(2)}`);
  console.log(`  Tips: $${barber.totalTips.toFixed(2)}`);
  console.log(`  Transactions: ${barber.transactionCount}`);
});
```

### Average Commission Rate by Location

```javascript
const { data: transactions } = await supabase
  .from('transactions')
  .select(`
    amount,
    description,
    appointments!inner (
      barbershops (
        name
      )
    )
  `)
  .eq('status', 'COMPLETED');

const locationCommissions = {};

transactions.forEach(tx => {
  const shopName = tx.appointments?.barbershops?.name || 'Unknown';
  const metadata = JSON.parse(tx.description || '{}');

  if (!locationCommissions[shopName]) {
    locationCommissions[shopName] = {
      totalRate: 0,
      count: 0
    };
  }

  locationCommissions[shopName].totalRate += metadata.commission_rate || 0;
  locationCommissions[shopName].count++;
});

// Calculate averages
Object.keys(locationCommissions).forEach(shopName => {
  const data = locationCommissions[shopName];
  const avgRate = (data.totalRate / data.count * 100).toFixed(0);
  console.log(`${shopName}: ${avgRate}% average commission rate`);
});
```

---

## Customer Analysis

### Top Customers by Spend

```javascript
const { data: transactions } = await supabase
  .from('transactions')
  .select(`
    amount,
    description,
    customer_id,
    appointments (
      client_name,
      client_email
    )
  `)
  .eq('status', 'COMPLETED')
  .not('customer_id', 'is', null);

const customerSpend = {};

transactions.forEach(tx => {
  const customerId = tx.customer_id;
  const customerName = tx.appointments?.client_name || 'Unknown';

  if (!customerSpend[customerId]) {
    customerSpend[customerId] = {
      name: customerName,
      totalSpent: 0,
      transactionCount: 0,
      totalTips: 0
    };
  }

  const metadata = JSON.parse(tx.description || '{}');
  customerSpend[customerId].totalSpent += tx.amount;
  customerSpend[customerId].totalTips += metadata.tip_amount || 0;
  customerSpend[customerId].transactionCount++;
});

// Sort by total spend
const topCustomers = Object.values(customerSpend)
  .sort((a, b) => b.totalSpent - a.totalSpent)
  .slice(0, 10);

console.log('Top 10 Customers:');
topCustomers.forEach((customer, idx) => {
  console.log(`${idx + 1}. ${customer.name}: $${customer.totalSpent.toFixed(2)}`);
  console.log(`   Visits: ${customer.transactionCount}, Avg Tip: $${(customer.totalTips / customer.transactionCount).toFixed(2)}`);
});
```

---

## Tip Analysis

### Average Tip Percentage by Location

```javascript
const { data: transactions } = await supabase
  .from('transactions')
  .select(`
    amount,
    description,
    appointments!inner (
      barbershops (
        name
      )
    )
  `)
  .eq('status', 'COMPLETED');

const tipsByLocation = {};

transactions.forEach(tx => {
  const shopName = tx.appointments?.barbershops?.name || 'Unknown';
  const metadata = JSON.parse(tx.description || '{}');
  const tipAmount = metadata.tip_amount || 0;
  const serviceAmount = tx.amount - tipAmount;

  if (!tipsByLocation[shopName]) {
    tipsByLocation[shopName] = {
      totalTips: 0,
      totalService: 0,
      count: 0
    };
  }

  tipsByLocation[shopName].totalTips += tipAmount;
  tipsByLocation[shopName].totalService += serviceAmount;
  tipsByLocation[shopName].count++;
});

// Calculate percentages
Object.keys(tipsByLocation).forEach(shopName => {
  const data = tipsByLocation[shopName];
  const avgTipPercent = ((data.totalTips / data.totalService) * 100).toFixed(1);
  const avgTipAmount = (data.totalTips / data.count).toFixed(2);

  console.log(`${shopName}:`);
  console.log(`  Avg Tip %: ${avgTipPercent}%`);
  console.log(`  Avg Tip Amount: $${avgTipAmount}`);
});
```

---

## Export Queries for Reporting

### Monthly Financial Summary

```javascript
async function generateMonthlyReport(year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      amount,
      description,
      payment_method,
      created_at,
      appointments (
        barbershops (
          name
        ),
        profiles (
          first_name,
          last_name
        )
      )
    `)
    .eq('status', 'COMPLETED')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // Calculate summary
  let totalRevenue = 0;
  let totalTips = 0;
  let totalCommissions = 0;
  const byLocation = {};
  const byBarber = {};
  const byPaymentMethod = { CARD: 0, DIGITAL_WALLET: 0, CASH: 0 };

  transactions.forEach(tx => {
    const metadata = JSON.parse(tx.description || '{}');
    const tipAmount = metadata.tip_amount || 0;
    const serviceRevenue = tx.amount - tipAmount;
    const commissionAmount = metadata.commission_amount || 0;

    totalRevenue += serviceRevenue;
    totalTips += tipAmount;
    totalCommissions += commissionAmount;

    // By location
    const shopName = tx.appointments?.barbershops?.name || 'Unknown';
    if (!byLocation[shopName]) byLocation[shopName] = 0;
    byLocation[shopName] += serviceRevenue;

    // By barber
    const barberName = `${tx.appointments?.profiles?.first_name || ''} ${tx.appointments?.profiles?.last_name || ''}`.trim();
    if (!byBarber[barberName]) byBarber[barberName] = { commissions: 0, tips: 0 };
    byBarber[barberName].commissions += commissionAmount;
    byBarber[barberName].tips += tipAmount;

    // By payment method
    const method = tx.payment_method?.toUpperCase() || 'CARD';
    if (byPaymentMethod[method] !== undefined) {
      byPaymentMethod[method] += tx.amount;
    }
  });

  return {
    period: `${year}-${String(month).padStart(2, '0')}`,
    summary: {
      totalRevenue,
      totalTips,
      totalCommissions,
      shopRevenue: totalRevenue - totalCommissions,
      transactionCount: transactions.length
    },
    byLocation,
    byBarber,
    byPaymentMethod
  };
}

// Usage
const report = await generateMonthlyReport(2025, 10);
console.log(JSON.stringify(report, null, 2));
```

---

## Performance Tips

### Optimize Large Queries

```javascript
// Use select count for totals instead of fetching all records
const { count } = await supabase
  .from('transactions')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'COMPLETED');

console.log(`Total completed transactions: ${count}`);
```

### Use Pagination for Large Datasets

```javascript
const ITEMS_PER_PAGE = 50;
let page = 0;
let hasMore = true;

while (hasMore) {
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1)
    .order('created_at', { ascending: false });

  if (transactions.length < ITEMS_PER_PAGE) {
    hasMore = false;
  }

  // Process transactions
  console.log(`Page ${page + 1}: ${transactions.length} transactions`);

  page++;
}
```

---

## Notes on Metadata Storage

All commission and tip data is stored in the `description` field as JSON. To access:

```javascript
const metadata = JSON.parse(transaction.description || '{}');

// Available fields:
// - metadata.commission_rate (decimal, e.g., 0.60 for 60%)
// - metadata.commission_amount (decimal, e.g., 24.00)
// - metadata.tip_amount (decimal, e.g., 7.20)
// - metadata.barbershop_id (UUID)
// - metadata.barber_id (UUID)
```

For production use, consider migrating these fields to dedicated columns for better performance and easier querying.

---

**Related Documentation:**
- `/database/TRANSACTION_SEEDING_SUMMARY.md` - Complete transaction seeding details
- `/docs/API_REFERENCE.md` - API endpoint documentation
- `/docs/SCHEMA_STANDARDS.md` - Database schema standards

---

*Last Updated: October 11, 2025*
