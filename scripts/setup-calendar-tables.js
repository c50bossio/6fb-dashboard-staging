#!/usr/bin/env node

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

)

)

const schemaPath = path.join(__dirname, '..', 'database', 'calendar-schema-with-test-flag.sql')
const schema = fs.readFileSync(schemaPath, 'utf8')

)

