-- Check the structure of the barbershops table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'barbershops' 
ORDER BY ordinal_position;