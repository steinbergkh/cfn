var uuid = require('uuid')
var stackEventsMock = {}

// creates date with time in future passed as param (int from -INT_MAX to +INT_MAX)
// the reason for doing this is bc
function createMockDate (timeInFuture) {
  timeInFuture = timeInFuture || 0
  var mockDate = new Date(Date.now() + timeInFuture)
  return mockDate.toISOString()
}

// creates new cloud formation event mock with unique event id
var cfEventFactory = function () {
  var eventId = uuid.v1()

  var cfEvent = {
    StackId: 'arn:aws:cloudformation:us-west-2:00000000000:stack/test-stack-name/000f000-0000-0000-a000-00000000000',
    StackName: 'test-stack-name',
        // default timestamp is 1 second in future
    Timestamp: createMockDate(1000),
        // set event timestamp relative to when stack update started
    setRelativeTimestamp: function (msInFuture) {
      this.Timestamp = createMockDate(msInFuture)
      return this
    }
  }
  return Object.assign(Object.create(cfEvent), {
    EventId: eventId
  })
}

// resource type cf stack
var cfStackEventFactory = function cfStackEventFactory (opts) {
  return Object.assign(cfEventFactory(), {
    PhysicalResourceId: 'arn:aws:cloudformation:us-west-2:00000000000:stack/test-stack-name/000f000-0000-0000-a000-00000000000',
    ResourceType: 'AWS::CloudFormation::Stack',
    LogicalResourceId: 'test-stack-name'
  }, opts)
}

var resourceStatusOpts = {
  UPDATE_COMPLETE: { 'ResourceStatus': 'UPDATE_COMPLETE' },
  UPDATE_IN_PROGRESS: { 'ResourceStatus': 'UPDATE_IN_PROGRESS' }
}

var mockEvents = {
  UPDATE_COMPLETE: cfStackEventFactory(resourceStatusOpts.UPDATE_COMPLETE),
  UPDATE_COMPLETE_PAST: cfStackEventFactory(resourceStatusOpts.UPDATE_COMPLETE).setRelativeTimestamp(0),
  UPDATE_IN_PROGRESS: cfStackEventFactory(resourceStatusOpts.UPDATE_IN_PROGRESS).setRelativeTimestamp(500)
}

stackEventsMock.updateComplete = [
  mockEvents.UPDATE_COMPLETE
]

stackEventsMock.updateInProgress = [
  mockEvents.UPDATE_IN_PROGRESS,
  mockEvents.UPDATE_COMPLETE_PAST
]

// stack events list has NextToken, expect describeStackEvents to call again
stackEventsMock.mockDescribeEventsResponsePage1 = {
  StackEvents: stackEventsMock.updateComplete,
  NextToken: 'token1'
}

// update in progress response
// no NextToken to signal end of stack events list
stackEventsMock.mockDescribeEventsResponsePage2 = {
  StackEvents: stackEventsMock.updateInProgress
}

stackEventsMock.mockEventTypes = mockEvents

module.exports = stackEventsMock
