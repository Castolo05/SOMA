const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, 'supabase_migration.sql')
let sql = fs.readFileSync(file, 'utf8')

// Replace CREATE POLICY with DROP POLICY IF EXISTS ... ON ...; CREATE POLICY ...
sql = sql.replace(/CREATE POLICY "([^"]+)" ON (\w+\.\w+)/g, 'DROP POLICY IF EXISTS "$1" ON $2;\nCREATE POLICY "$1" ON $2')

fs.writeFileSync(file, sql)
console.log('SQL file updated with DROP POLICY IF EXISTS')
