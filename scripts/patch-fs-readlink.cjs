const fs = require('fs');

const origReadlink = fs.readlink;
fs.readlink = function patchedReadlink(...args) {
  const cb = args[args.length - 1];
  if (typeof cb === 'function') {
    args[args.length - 1] = function (err, res) {
      if (err && err.code === 'EISDIR') {
        err.code = 'EINVAL';
      }
      return cb(err, res);
    };
  }
  return origReadlink.apply(this, args);
};

const origReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function patchedReadlinkSync(...args) {
  try {
    return origReadlinkSync.apply(this, args);
  } catch (err) {
    if (err && err.code === 'EISDIR') {
      err.code = 'EINVAL';
    }
    throw err;
  }
};

if (fs.promises && typeof fs.promises.readlink === 'function') {
  const origPromisesReadlink = fs.promises.readlink;
  fs.promises.readlink = async function patchedPromisesReadlink(...args) {
    try {
      return await origPromisesReadlink.apply(this, args);
    } catch (err) {
      if (err && err.code === 'EISDIR') {
        err.code = 'EINVAL';
      }
      throw err;
    }
  };
}
