'use strict'

/**
 * Main Stack Cloud Formation Module
 */

module.exports = function (params) {
  return {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: 'Test Stack',
    Resources: {
      testTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          AttributeDefinitions: [
            {
              AttributeName: 'id',
              AttributeType: 'S'
            }
          ],
          KeySchema: [
            {
              AttributeName: 'id',
              KeyType: 'HASH'
            }
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: '1',
            WriteCapacityUnits: '1'
          },
          TableName: 'TEST-TABLE-3-' + params.testParam
        }
      }
    }
  }
}
