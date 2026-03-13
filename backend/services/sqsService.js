const AWS = require('aws-sdk');
const dotenv = require('dotenv');

dotenv.config();

const sqs = new AWS.SQS({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const QUEUE_URL = process.env.SQS_QUEUE_URL;

// Send job message to SQS
const sendJobToQueue = async (videoKey, videoId, originalName) => {
  const message = {
    videoKey,
    videoId,
    originalName,
    tasks: ['compress', 'thumbnail', 'preview', 'watermark', 'metadata', 'convert'],
    timestamp: new Date().toISOString()
  };

  const params = {
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify(message),
    MessageAttributes: {
      videoId: {
        DataType: 'String',
        StringValue: videoId
      }
    }
  };

  const result = await sqs.sendMessage(params).promise();
  console.log(`✅ Job sent to SQS: ${result.MessageId}`);
  return result.MessageId;
};

// Receive messages from SQS
const receiveMessages = async () => {
  const params = {
    QueueUrl: QUEUE_URL,
    MaxNumberOfMessages: 1,
    WaitTimeSeconds: 20,
    MessageAttributeNames: ['All']
  };

  const result = await sqs.receiveMessage(params).promise();
  return result.Messages || [];
};

// Delete message from SQS after processing
const deleteMessage = async (receiptHandle) => {
  const params = {
    QueueUrl: QUEUE_URL,
    ReceiptHandle: receiptHandle
  };

  await sqs.deleteMessage(params).promise();
  console.log('✅ Message deleted from SQS queue');
};

module.exports = { sendJobToQueue, receiveMessages, deleteMessage };
