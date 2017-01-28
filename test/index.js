'use strict'

var path = require('path')
var mocha = require('mocha')
var describe = mocha.describe
var beforeEach = mocha.beforeEach
var afterEach = mocha.afterEach
var it = mocha.it
var sinon = require('sinon')
var should = require('should')
require('./assertions')
require('should-sinon')

var AWS = require('aws-sdk-mock')

describe('create/update', function () {
  this.timeout(6000)
  var describeStackEventsStub, numDescribeStackEventsCalls
  beforeEach(function () {
    AWS.mock('CloudFormation', 'describeStacks', function (params, callback) {
      callback(null, require('./mocks/describe-stacks').response)
    })
    AWS.mock('CloudFormation', 'updateStack', function (params, callback) {
      callback(null, 'success!')
    })
  })
  afterEach(function () {
    AWS.restore()
  })
  describe('if stack events need to be paginated', function () {
    beforeEach(function () {
      numDescribeStackEventsCalls = 0
      describeStackEventsStub = AWS.mock('CloudFormation', 'describeStackEvents', function (params, callback) {
        var stackEvents = require('./mocks/stack-events')
        ++numDescribeStackEventsCalls
        // if next token is provided, respond with mock that has no "NextToken"
        if (params.NextToken === 'token1') {
          return callback(null, stackEvents.mockDescribeEventsResponsePage2)
        } else {
          return callback(null, stackEvents.mockDescribeEventsResponsePage1)
        }
      })
    })
    it('should call describe stack events twice', function () {
      var cfn = require('../')
      return cfn({ name: 'TEST-JSON-TEMPLATE' }, path.join(__dirname, '/templates/test-template-1.json'))
        .then(function () {
          describeStackEventsStub.stub.should.be.calledTwice()
          // first call should have nextToken === undefined
          var firstCall = describeStackEventsStub.stub.firstCall
          firstCall.args[ 0 ].StackName.should.equal('TEST-JSON-TEMPLATE')
          should(firstCall.args[ 0 ].NextToken).be.undefined()

          // second call nextToken should be 'token1'
          var secondCall = describeStackEventsStub.stub.secondCall
          secondCall.args[ 0 ].StackName.should.equal('TEST-JSON-TEMPLATE')
          secondCall.args[ 0 ].NextToken.should.equal('token1')
        })
    })
  })
  describe('if update is in progress', function () {
    beforeEach(function () {
      numDescribeStackEventsCalls = 0
      describeStackEventsStub = AWS.mock('CloudFormation', 'describeStackEvents', function (params, callback) {
        var stackEvents = require('./mocks/stack-events')
        ++numDescribeStackEventsCalls
        // on first call, return with update still in progress mock stack events
        if (numDescribeStackEventsCalls < 2) {
          return callback(null, { StackEvents: stackEvents.updateInProgress })
        } else {
          // on second call, return with stack update complete mock events
          return callback(null, { StackEvents: stackEvents.updateComplete })
        }
      })
    })
    it('should loop until update is complete', function () {
      var cfn = require('../')
      return cfn({ name: 'TEST-JSON-TEMPLATE', checkStackInterval: 1000 },
        path.join(__dirname, '/templates/test-template-1.json'))
        .then(function () {
          describeStackEventsStub.stub.should.be.calledTwice()
          // first call should have nextToken === undefined
          var firstCall = describeStackEventsStub.stub.firstCall
          firstCall.args[ 0 ].StackName.should.equal('TEST-JSON-TEMPLATE')
          should(firstCall.args[ 0 ].NextToken).be.undefined()

          // make sure 2nd call isn't due to pagination
          var secondCall = describeStackEventsStub.stub.secondCall
          secondCall.args[ 0 ].StackName.should.equal('TEST-JSON-TEMPLATE')
          should(secondCall.args[ 0 ].NextToken).be.undefined()
        })
    })
  })
  describe('createOrUpdate', function () {
    var updateStackStub, createStackStub
    beforeEach(function () {
      AWS.restore()
      // setup create/update stack stubs
      updateStackStub = AWS.mock('CloudFormation', 'updateStack', sinon.stub().callsArgWith(1, null, 'updated'))
      createStackStub = AWS.mock('CloudFormation', 'createStack', sinon.stub().callsArgWith(1, null, 'created'))

      AWS.mock('CloudFormation', 'describeStackEvents', function (params, callback) {
        var stackEvents = require('./mocks/stack-events')
        callback(null, {
          StackEvents: stackEvents.updateComplete
        })
      })
    })

    describe('if stack already exists', function () {
      var successStub
      beforeEach(function () {
        successStub = sinon.stub().callsArgWith(1, null, require('./mocks/describe-stacks').response)
        AWS.mock('CloudFormation', 'describeStacks', successStub)
      })
      it('updates stack', function () {
        var cfn = require('../')
        return cfn('TEST-JSON-TEMPLATE', path.join(__dirname, '/templates/test-template-1.json'))
          .then(function () {
            // should only have called update, not create
            createStackStub.stub.should.not.be.called()
            updateStackStub.stub.should.be.calledOnce()
          })
      })
    })
    describe('if stack does not exist', function () {
      beforeEach(function () {
        // callback w/ err to simulate stack doesn't exist
        AWS.mock('CloudFormation', 'describeStacks',
          sinon.stub().callsArgWith(1, 'stack does not exist!', null))
      })
      it('creates stack', function () {
        var cfn = require('../')
        return cfn('TEST-JSON-TEMPLATE', path.join(__dirname, '/templates/test-template-1.json'))
          .then(function () {
            createStackStub.stub.should.be.calledOnce()
            updateStackStub.stub.should.not.be.called()
          })
      })
    })
  })
})

describe('CF templates', function () {
  this.timeout(6000)
  var updateStackStub
  beforeEach(function () {
    AWS.restore()
    // setup create/update stack stubs
    updateStackStub = AWS.mock('CloudFormation', 'updateStack', sinon.stub().callsArgWith(1, null, 'updated'))

    AWS.mock('CloudFormation', 'describeStackEvents', function (params, callback) {
      callback(null, { StackEvents: require('./mocks/stack-events').updateComplete })
    })

    AWS.mock('CloudFormation', 'describeStacks',
      sinon.stub().callsArgWith(1, null, require('./mocks/describe-stacks').response))
  })
  describe('Create / Update json template', function () {
    it('renders json string template correctly', function () {
      var cfn = require('../')
      return cfn('TEST-JSON-TEMPLATE', path.join(__dirname, '/templates/test-template-1.json'))
        .then(function () {
          updateStackStub.stub.should.be.calledWithCFStackParams('TEST-JSON-TEMPLATE', [ 'CAPABILITY_IAM' ],
            require(path.join(__dirname, '/templates/test-template-1.json')))
        })
    })
  })
  describe('Create / Update js template', function () {
    it('creates stack with correct template', function () {
      var cfn = require('../')
      return cfn('TEST-JS-TEMPLATE', path.join(__dirname, '/templates/test-template-2.js'))
        .then(function () {
          updateStackStub.stub.should.be.calledWithCFStackParams('TEST-JS-TEMPLATE', [ 'CAPABILITY_IAM' ],
            require(path.join(__dirname, '/templates/test-template-2.js')))
        })
    })
  })
  describe('Create / Update js function template', function () {
    it('should render template with params', function () {
      var cfn = require('../')
      var testParams = { testParam: 'TEST-PARAM' }
      return cfn({
        name: 'TEST-JS-FN-TEMPLATE',
        template: path.join(__dirname, '/templates/test-template-3.js'),
        params: testParams
      }).then(function () {
        updateStackStub.stub.should.be.calledWithCFStackParams('TEST-JS-FN-TEMPLATE', [ 'CAPABILITY_IAM' ],
          require(path.join(__dirname, '/templates/test-template-3.js'))(testParams))
      })
    })
  })
})
