/**
 * ESLint Plugin: No Mock Data
 * 
 * This ESLint plugin enforces the NO MOCK DATA policy at build time.
 * It detects and reports mock data patterns in JavaScript/TypeScript code.
 */

module.exports = {
  rules: {
    'no-mock-data': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow mock data in production code',
          category: 'Best Practices',
          recommended: true
        },
        fixable: null,
        schema: [
          {
            type: 'object',
            properties: {
              allowInTests: {
                type: 'boolean',
                default: true
              },
              allowInDevelopment: {
                type: 'boolean',
                default: false
              },
              customPatterns: {
                type: 'array',
                items: { type: 'string' },
                default: []
              }
            },
            additionalProperties: false
          }
        ],
        messages: {
          mockDataDetected: 'Mock data detected: "{{value}}". Use real database data instead.',
          mockFunctionDetected: 'Mock data generator function "{{name}}" detected. Use database queries instead.',
          hardcodedDataDetected: 'Hardcoded data array detected. Fetch from database instead.',
          testDataInProduction: 'Test data patterns detected in production code: "{{pattern}}"'
        }
      },
      
      create(context) {
        const options = context.options[0] || {};
        const allowInTests = options.allowInTests !== false;
        const allowInDevelopment = options.allowInDevelopment === true;
        
        const filename = context.getFilename();
        const isTestFile = /\.(test|spec)\.[jt]sx?$/.test(filename) || 
                          filename.includes('__tests__');
        
        if (isTestFile && allowInTests) {
          return {};
        }

        const mockPatterns = [
          /mock/i,
          /fake/i,
          /dummy/i,
          /generateMock/i,
          /generateFake/i,
          /generateDummy/i,
          /createMock/i,
          /createFake/i,
          /Customer \d+/,
          /Test User/i,
          /John Doe/i,
          /Jane Doe/i,
          /test@test\.com/i,
          /foo@example\.com/i,
          /Lorem ipsum/i,
          ...options.customPatterns || []
        ];

        return {
          VariableDeclarator(node) {
            const name = node.id.name;
            
            if (/^(mock|fake|dummy|test|sample)/i.test(name)) {
              context.report({
                node,
                messageId: 'mockDataDetected',
                data: { value: name }
              });
            }

            if (node.init && node.init.type === 'ArrayExpression') {
              const hasHardcodedData = node.init.elements.some(element => {
                if (element && element.type === 'ObjectExpression') {
                  return element.properties.some(prop => {
                    if (prop.value && prop.value.type === 'Literal') {
                      const value = String(prop.value.value);
                      return mockPatterns.some(pattern => pattern.test(value));
                    }
                    return false;
                  });
                }
                return false;
              });

              if (hasHardcodedData) {
                context.report({
                  node: node.init,
                  messageId: 'hardcodedDataDetected'
                });
              }
            }
          },

          FunctionDeclaration(node) {
            const name = node.id && node.id.name;
            if (name && /^(generate|create|make)(Mock|Fake|Dummy|Test|Sample)/i.test(name)) {
              context.report({
                node,
                messageId: 'mockFunctionDetected',
                data: { name }
              });
            }
          },

          'FunctionExpression, ArrowFunctionExpression'(node) {
            const parent = node.parent;
            if (parent && parent.type === 'VariableDeclarator') {
              const name = parent.id && parent.id.name;
              if (name && /^(generate|create|make)(Mock|Fake|Dummy|Test|Sample)/i.test(name)) {
                context.report({
                  node: parent,
                  messageId: 'mockFunctionDetected',
                  data: { name }
                });
              }
            }
          },

          Literal(node) {
            if (typeof node.value === 'string') {
              const value = node.value;
              
              if (value.length < 3 || 
                  value.startsWith('http') || 
                  value.startsWith('/') ||
                  value.startsWith('.') ||
                  value.includes('import')) {
                return;
              }

              const testPatterns = [
                /^Customer \d+$/,
                /^Test User \d*$/i,
                /^John Doe$/i,
                /^Jane Doe$/i,
                /^test@test\.com$/i,
                /^foo@example\.com$/i,
                /^Lorem ipsum/i,
                /^Service$/ // Just "Service" without specifics
              ];

              for (const pattern of testPatterns) {
                if (pattern.test(value)) {
                  context.report({
                    node,
                    messageId: 'testDataInProduction',
                    data: { pattern: value }
                  });
                  break;
                }
              }
            }
          },

          CallExpression(node) {
            if (node.callee.type === 'MemberExpression' &&
                node.callee.object.name === 'Math' &&
                node.callee.property.name === 'random') {
              
              const parent = node.parent;
              if (parent && parent.type === 'MemberExpression' ||
                  (parent && parent.type === 'BinaryExpression')) {
                const sourceCode = context.getSourceCode();
                const text = sourceCode.getText(node.parent.parent || node.parent);
                
                if (/customer|user|product|service|booking|appointment/i.test(text)) {
                  context.report({
                    node,
                    messageId: 'mockDataDetected',
                    data: { value: 'Math.random() used for data generation' }
                  });
                }
              }
            }
          },

          'CallExpression[callee.property.name="from"]'(node) {
            if (node.callee.object && node.callee.object.name === 'Array') {
              const args = node.arguments;
              if (args.length >= 2 && args[1]) {
                const sourceCode = context.getSourceCode();
                const mapperText = sourceCode.getText(args[1]);
                
                if (/customer|user|product|mock|fake|dummy/i.test(mapperText)) {
                  context.report({
                    node,
                    messageId: 'mockDataDetected',
                    data: { value: 'Array.from() generating mock data' }
                  });
                }
              }
            }
          }
        };
      }
    },

    'no-hardcoded-ids': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow hardcoded IDs that should come from database',
          category: 'Best Practices',
          recommended: true
        },
        messages: {
          hardcodedId: 'Hardcoded ID "{{value}}" detected. Use database-generated IDs instead.'
        }
      },
      
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === 'string') {
              const value = node.value;
              const idPatterns = [
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, // UUID
                /^(user|customer|product|service|booking|barber|shop)_\d+$/i, // Pattern IDs
                /^test_/i // Test IDs
              ];

              if (idPatterns.some(pattern => pattern.test(value))) {
                const parent = node.parent;
                
                if (parent.type === 'Property' && parent.key === node) {
                  return;
                }
                
                const filename = context.getFilename();
                if (filename.includes('test') || 
                    filename.includes('spec') ||
                    filename.includes('migration') ||
                    filename.includes('seed')) {
                  return;
                }

                context.report({
                  node,
                  messageId: 'hardcodedId',
                  data: { value }
                });
              }
            }
          }
        };
      }
    }
  },

  configs: {
    recommended: {
      plugins: ['no-mock-data'],
      rules: {
        'no-mock-data/no-mock-data': 'error',
        'no-mock-data/no-hardcoded-ids': 'warn'
      }
    },
    strict: {
      plugins: ['no-mock-data'],
      rules: {
        'no-mock-data/no-mock-data': ['error', {
          allowInTests: true,
          allowInDevelopment: false
        }],
        'no-mock-data/no-hardcoded-ids': 'error'
      }
    }
  }
};