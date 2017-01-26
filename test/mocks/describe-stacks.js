var describeStacksMock = {}

describeStacksMock.response = {
  'ResponseMetadata': {
    'RequestId': '75910902-bd63-11e6-aa30-ad2ddc67a636'
  },
  'Stacks': [
    {
      'StackId': 'arn:aws:cloudformation:us-west-2:0000000000:stack/TEST-JSON-TEMPLATE/0000000-bbf9-11e6-aa85-50d5ca11b856',
      'StackName': 'TEST-JSON-TEMPLATE',
      'Description': 'Stack for testing json template',
      'Parameters': [],
      'CreationTime': 'Tue Dec 06 2016 15:16:05 GMT-0600 (CST)',
      'LastUpdatedTime': 'Tue Dec 06 2016 16:08:10 GMT-0600 (CST)',
      'StackStatus': 'UPDATE_COMPLETE',
      'DisableRollback': false,
      'NotificationARNs': [],
      'Capabilities': [],
      'Outputs': [],
      'Tags': []
    }
  ]
}

module.exports = describeStacksMock
