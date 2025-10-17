/**
 * CIN7 CSV Import Fallback
 * When API access isn't working, import inventory from CSV export
 */

export function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    if (values.length >= headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
  }
  
  return data;
}

export function convertCSVToInventory(csvData) {
  return csvData.map(item => ({
    cin7_id: item.ID || item.SKU || generateId(),
    name: item.ProductName || item.Name || 'Unknown Product',
    sku: item.SKU || '',
    barcode: item.Barcode || '',
    description: item.Description || '',
    category: item.Category || 'Uncategorized',
    brand: item.Brand || '',
    supplier: item.Supplier || '',
    unit_cost: parseFloat(item.Cost || item.AverageCost || 0),
    retail_price: parseFloat(item.PriceTier1 || item.Price || 0),
    current_stock: parseFloat(item.Available || item.OnHand || 0),
    min_stock: parseFloat(item.MinStock || 0),
    max_stock: parseFloat(item.MaxStock || 0),
    location: item.Location || item.BinLocation || '',
    last_updated: new Date().toISOString()
  }));
}

function generateId() {
  return 'CSV_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export async function importFromCSVFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csvContent = e.target.result;
        const csvData = parseCSV(csvContent);
        const inventory = convertCSVToInventory(csvData);
        
        // Calculate totals
        const totalValue = inventory.reduce((sum, item) => 
          sum + (item.current_stock * item.retail_price), 0
        );
        
        const totalItems = inventory.length;
        const totalStock = inventory.reduce((sum, item) => 
          sum + item.current_stock, 0
        );
        
        resolve({
          success: true,
          inventory,
          stats: {
            totalItems,
            totalStock,
            totalValue,
            importedAt: new Date().toISOString()
          }
        });
      } catch (error) {
        reject({
          success: false,
          error: error.message
        });
      }
    };
    
    reader.onerror = () => {
      reject({
        success: false,
        error: 'Failed to read file'
      });
    };
    
    reader.readAsText(file);
  });
}

// Store imported data in localStorage for persistence
export function saveImportedInventory(inventory) {
  localStorage.setItem('cin7_imported_inventory', JSON.stringify(inventory));
  localStorage.setItem('cin7_import_date', new Date().toISOString());
}

export function getImportedInventory() {
  const stored = localStorage.getItem('cin7_imported_inventory');
  if (stored) {
    return JSON.parse(stored);
  }
  return null;
}

export function getImportDate() {
  return localStorage.getItem('cin7_import_date');
}