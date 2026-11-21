function createReportWriteQueue() {
  let pendingWrites = Promise.resolve();

  return function serializeReportWrite(operation) {
    const write = pendingWrites.then(operation, operation);
    pendingWrites = write.then(() => undefined, () => undefined);
    return write;
  };
}

module.exports = createReportWriteQueue;
